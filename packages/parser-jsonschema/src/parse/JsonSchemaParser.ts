import {
  OMNI_GENERIC_FEATURES,
  OmniArrayKind,
  OmniArrayTypes,
  OmniComparisonOperator,
  OmniDecoratingType,
  OmniEnumMember,
  OmniEnumType,
  OmniExample, OmniExclusiveUnionType, OmniItemKind,
  OmniModel,
  OmniModelParserResult,
  OmniObjectType,
  OmniPrimitiveKinds,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyName,
  OmniPropertyOwner,
  OmniSubTypeHint,
  OmniTupleType,
  OmniType,
  OmniTypeKind,
  Parser,
  ParserOptions,
  TypeName,
  UnknownKind,
} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {DiscriminatorAware} from './DiscriminatorAware.js';
import {Case, CompositionUtil, getShallowPayloadString, isDefined, Naming, OmniUtil, SchemaFile, ToDefined} from '@omnigen/core';
import {ApplyIdJsonSchemaTransformerFactory, SimplifyJsonSchemaTransformerFactory} from '../transform';
import {ExternalDocumentsFinder, RefResolver, ToSingle} from '../visit';
import Ajv2020, {ErrorObject} from 'ajv/dist/2020';
import {JsonSchemaMigrator} from '../migrate';
import {JSONSchema9, JSONSchema9Definition, JSONSchema9Type, JSONSchema9TypeName} from '../definitions';
import {DocumentStore, JsonPathFetcher} from '@omnigen/core-json';
import {JsonExpander} from '@omnigen-org/json-expander';

const logger = LoggerFactory.create(import.meta.url);

export type SchemaToTypeResult = { type: OmniType };

// TODO: Move into OpenApiJsonSchemaParser
export interface PostDiscriminatorMapping {
  type: OmniObjectType;
  schema: DiscriminatorAwareSchema;
}

export type AnyJSONSchema = JSONSchema9;
export type AnyJsonDefinition = JSONSchema9Definition;
// TODO: Move into OpenApiJsonSchemaParser
export type DiscriminatorAwareSchema = boolean | (AnyJSONSchema & DiscriminatorAware);

const DISREGARDED_PROPERTIES: string[] = ['allOf', 'oneOf', 'anyOf', 'oneOf', 'not', '$id', 'type', 'default'] satisfies (keyof AnyJSONSchema)[];

const CONTENT_PROPERTIES: string[] = [
  'properties', 'patternProperties', 'additionalProperties', 'unevaluatedProperties', 'propertyNames', 'enum', 'default', 'format',
  'const', 'items', 'additionalItems', 'unevaluatedItems',
] satisfies (keyof AnyJSONSchema)[];

type JsonSchemaTypeWithAny = ToSingle<AnyJSONSchema['type']> | 'any';

export class DefaultJsonSchemaParser implements Parser {

  private readonly _schemaFile: SchemaFile;
  private readonly _parserOptions: ParserOptions;

  constructor(schemaFile: SchemaFile, parserOptions: ParserOptions) {
    this._schemaFile = schemaFile;
    this._parserOptions = parserOptions;
  }

  async parse(): Promise<OmniModelParserResult<ParserOptions>> {

    const docStore = new DocumentStore();
    let root = await this._schemaFile.asObject<AnyJSONSchema>();
    root = JsonSchemaParser.preProcessJsonSchema(this._schemaFile.getAbsolutePath(), root, docStore);

    const model: OmniModel = {
      kind: OmniItemKind.MODEL,
      name: root.$id || '',
      version: '1.0',
      endpoints: [],
      servers: [],
      schemaVersion: root.$schema || '',
      schemaType: 'jsonschema',
      types: [],
    };

    const fileUri = this._schemaFile.getAbsolutePath() ?? '';

    const refResolver = await (new ExternalDocumentsFinder(fileUri, root).create());

    const jsonSchemaParser = new JsonSchemaParser(refResolver, this._parserOptions);

    for (const schema of this.getAllSchemas(root)) {

      const s = schema[1];
      const resolved = refResolver.resolve(s);

      try {
        const omniTypeRes = jsonSchemaParser.jsonSchemaToType(schema[0], resolved);
        model.types.push(omniTypeRes.type);
        // if (OmniUtil.asExtendable(omniTypeRes.type)) {
        //   if (omniTypeRes.type.extendedBy && !model.types.includes(omniTypeRes.type.extendedBy)) {
        //     model.types.push(omniTypeRes.type.extendedBy);
        //   }
        // }
      } catch (ex) {
        const schemaName = typeof schema[1] === 'boolean' ? '{}' : (schema[1].$id ?? schema[1].title ?? schema[1].description ?? '???');
        throw new Error(`Error when handling schema '${schemaName}'`, {cause: ex});
      }
    }

    return {
      model: model,
      options: this._parserOptions,
    };
  }

  private* getAllSchemas(schema: JSONSchema9Definition): Generator<[string | undefined, AnyJsonDefinition]> {

    if (typeof schema === 'boolean') {
      return;
    }

    if (schema.properties || schema.patternProperties || schema.type || schema.default !== undefined || (schema.type === undefined && schema.enum) || schema.format) {
      yield [undefined, schema];
    }

    if (schema.$defs) {
      for (const e of Object.entries(schema.$defs)) {
        yield e;
      }
    }

    if (schema.definitions) {
      for (const e of Object.entries(schema.definitions)) {
        yield e;
      }
    }
  }
}

/**
 * TODO: This class needs some refactoring after being split out from OpenRpcParser
 *        It should be easy to use the JsonSchemaParser from other parsers; right now quite clumsy and locked to OpenRpc.
 */
export class JsonSchemaParser<TOpt extends ParserOptions> {

  // TODO: Move this to the root? But always have the key be the absolute path?
  private readonly _typeMap = new Map<string, OmniType>();
  private readonly _postDiscriminatorMapping: PostDiscriminatorMapping[] = [];

  private readonly _refResolver: RefResolver;

  private readonly _options: TOpt;

  constructor(refResolver: RefResolver, options: TOpt) {
    this._refResolver = refResolver;
    this._options = options;
  }

  protected get refResolver() {
    return this._refResolver;
  }

  public getPostDiscriminatorMappings(): PostDiscriminatorMapping[] {
    return this._postDiscriminatorMapping;
  }

  /**
   * Register a custom type as if it actually existed inside the schema.
   * Can be used to make sure that the type is found when converting from an OmniModel into a syntax tree.
   *
   * @param className - The name of the class to register, it will be faked as having an uri in a document
   * @param type - The type that should be force-registered
   */
  public registerCustomTypeManually(className: string, type: OmniType): void {
    this._typeMap.set(`#/custom/schemas/${className}`, type);
  }

  public jsonSchemaToType(
    name: TypeName | undefined,
    schema: AnyJsonDefinition,
    ownerSchema?: AnyJSONSchema | undefined,
  ): SchemaToTypeResult {

    // If contentDescriptor contains an anonymous schema,
    // then we want to be able to say that the ref to that schema is the ref of the contentDescriptor.
    // That way we will not get duplicates of the schema when called from different locations.
    const id: string | undefined = (typeof schema == 'object') ? schema.$id : (`_${JsonSchemaParser._uniqueCounter++}`);
    if (!id) {
      throw new Error(`Encountered schema without ID: ${getShallowPayloadString(schema)} (${name ? Naming.unwrap(name) : ''}); should have been assigned by schema transformers`);
    }

    const existing = this._typeMap.get(id);
    if (existing) {
      return {
        type: existing,
      };
    }

    if (!name) {
      name = id;
    }

    // Hack to be able to set a cached placeholder.
    // This is required if there are recursive types.
    // TODO: Perhaps add a special 'kind' that is 'PLACEHOLDER' so it can be reasoned about in other parts of the code, and not just have `kind: undefined`
    // const omniType: OmniType = {} as OmniType;
    // this._typeMap.set(id, omniType);

    const extendedBy = this.getExtendedBy(schema, name);
    const defaultType = this.getDefaultFromSchema(schema, name);

    const schemaTypes = new Set<JSONSchema9TypeName | undefined>;
    const schemaType = (typeof schema === 'object') ? schema.type : undefined;
    if (Array.isArray(schemaType)) {
      // The schema type is an array, so this type will ultimately become an exclusive union containing the different types.
      for (const type of schemaType) {
        schemaTypes.add(type);
      }
    } else {

      // It is a type or undefined, if `undefined` it is up to later code to decide what it is.
      schemaTypes.add(schemaType);
    }

    let union: OmniExclusiveUnionType | undefined = undefined;
    if (schemaTypes.size > 1) {
      union = {
        kind: OmniTypeKind.EXCLUSIVE_UNION,
        types: [],
      };

      // Need to register the union before it is completed, in case there are recursive references.
      this._typeMap.set(id, union);
    }

    const omniTypes: OmniType[] = [];
    for (const schemaType of schemaTypes) {

      let omniType = this.jsonSchemaToNonObjectType(schema, ownerSchema, name, id, extendedBy, defaultType, schemaType);
      if (!omniType) {

        // If it's nothing else, then it's an object.
        omniType = this.jsonSchemaToObjectType(schema, name, id, extendedBy);
      }

      omniTypes.push(omniType);
    }

    // const actualOmniType = this.jsonSchemaToNonObjectType(schema, ownerSchema, name, id, extendedBy, defaultType) ?? this.jsonSchemaToObjectType(schema, name, id, extendedBy);
    // Object.assign(omniType, actualOmniType);

    if (union) {

      const schemaTypesArray = [...schemaTypes];

      union.types = omniTypes;

      for (let i = 0; i < omniTypes.length; i++) {
        const type = omniTypes[i];
        this._typeMap.set(`${id}-${i}`, type);
      }

      // The union should take the name of the first item, since it will be the same for all union items.
      union.name = OmniUtil.getTypeName(omniTypes[0]);

      for (let i = 0; i < omniTypes.length; i++) {
        const type = omniTypes[i];
        if ('name' in type) {
          type.name = {
            name: type.name ?? 'ProblematicSchemaUnion',
            suffix: schemaTypesArray[i] ?? '',
          };
        }
      }
    }

    const omniType = (omniTypes.length > 1)
      ? union!
      : omniTypes[0];

    this._typeMap.set(id, omniType);

    let subTypeHints: OmniSubTypeHint[] | undefined = undefined;
    let postDiscriminatorNeeded = false;
    const discriminatorAware = this.getDiscriminatorAware(schema);
    if (discriminatorAware) {

      // This is an OpenApi JSON Schema.
      // Discriminators do not actually exist in JSONSchema, but it is way too useful to not make use of.
      // I think most people would think that this is supported for OpenRpc as well, as it should be.
      const subTypeHintsResult = this.getSubTypeHints(discriminatorAware);
      subTypeHints = subTypeHintsResult.hints;
      postDiscriminatorNeeded = subTypeHintsResult.postDiscriminatorNeeded;
    }

    if (omniType.kind === OmniTypeKind.OBJECT) {

      if (discriminatorAware && postDiscriminatorNeeded) {
        this._postDiscriminatorMapping.push({
          type: omniType,
          schema: discriminatorAware,
        });
      }

      if (subTypeHints && subTypeHints.length > 0) {
        omniType.subTypeHints = subTypeHints;
      }
    }

    return {
      type: omniType,
    };
  }

  public static preProcessJsonSchema(absolutePath: string | undefined, root: AnyJSONSchema, docStore: DocumentStore): typeof root {

    // TODO: Add schema version migration, should support from 04 -> 2020

    const expander = new JsonExpander(uri => JsonPathFetcher.get(uri, docStore));
    expander.expand(root, absolutePath);

    const migrator = new JsonSchemaMigrator();
    migrator.migrate(root);

    const ajv = new Ajv2020({allErrors: true, strict: false});
    const schemaVersion = ajv.defaultMeta() ?? 'https://json-schema.org/draft/2020-12/schema';

    const valid = ajv.validate(schemaVersion, root);
    if (!valid) {

      const errors = (ajv.errors || []);
      const message = JsonSchemaParser.ajvErrorsToPrettyError(errors);
      throw new Error(message || ajv.errorsText() || 'JSONSchema Unknown Validation Error');
    }

    const transformers = [
      // new NormalizeDefsJsonSchemaTransformerFactory().create(),
      new SimplifyJsonSchemaTransformerFactory().create(),
      new ApplyIdJsonSchemaTransformerFactory(absolutePath).create(),
    ];

    for (const transformer of transformers) {
      const transformed = transformer.visit(root, transformer);
      if (transformed && typeof transformed == 'object') {
        root = transformed;
      }
    }

    return root;
  }

  private static ajvErrorsToPrettyError(errors: ErrorObject[]) {

    const messages: string[] = [];
    for (const error of errors) {
      messages.push(`@ ${error.schemaPath} => ${error.message}: ${JSON.stringify(error.params)}`);
    }

    return `\n${messages.join('\n')}`;
  }

  private jsonSchemaToObjectType(
    schema: AnyJsonDefinition,
    name: TypeName,
    actualRef: string | undefined,
    extendedBy?: OmniType,
  ): OmniType {

    if (typeof schema == 'boolean') {
      throw new Error(`Not allowed`);
    }

    const names: TypeName[] = [name];

    if (schema.title) {
      names.push({
        prefix: Case.pascal(String(schema.title)),
        name: name,
      });
    }

    names.push({
      name: name,
      suffix: 'object',
    });

    const type: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: names,
      description: schema.description,
      title: schema.title,
      properties: [],
      abstract: JsonSchemaParser.vendorExtensionToBool(schema, 'x-abstract', false),
    };

    if (actualRef && !this._typeMap.has(actualRef)) {

      // Need to save it to the type map as soon as we can.
      // Otherwise we might end up with recursive loops in the schema.
      // This way we might be able to mitigate most of them.
      this._typeMap.set(actualRef, type);
    }

    const properties: OmniProperty[] = [];
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        const propertySchema = schema.properties[key];
        const resolvedPropertySchema = this._refResolver.resolve(propertySchema);

        properties.push(this.toOmniPropertyFromJsonSchema(type, key, resolvedPropertySchema, schema));
      }
    }

    if (schema.patternProperties) {

      for (const [propertyPattern, propertySchema] of Object.entries(schema.patternProperties)) {

        const resolved = this._refResolver.resolve(propertySchema);
        const patternTypeName: TypeName | undefined = undefined;
        const additionalPropertiesTypeRes = this.jsonSchemaToType(patternTypeName, resolved, schema);
        const additionalPropertiesType = this.normalizeAdditionalPropertiesType(additionalPropertiesTypeRes.type);

        properties.push({
          kind: OmniItemKind.PROPERTY,
          name: {
            isPattern: true,
            name: new RegExp(propertyPattern),
          },
          type: additionalPropertiesType,
        });
      }
    }

    // additionalProperties is added last, as a fallthrough match. This ordering is important.
    const additionalProperties = schema.additionalProperties ?? this._options.defaultAdditionalProperties;
    if (additionalProperties) {

      const additionalPropertiesTypeName: TypeName = {name: names, suffix: 'AdditionalProperties'};
      const resolvedAdditional = this._refResolver.resolve(additionalProperties);
      const additionalPropertiesTypeRes = this.jsonSchemaToType(additionalPropertiesTypeName, resolvedAdditional, schema);
      const additionalPropertiesType = this.normalizeAdditionalPropertiesType(additionalPropertiesTypeRes.type);

      let additionalPropertiesPropertyName: OmniPropertyName | undefined = undefined;
      if (schema.propertyNames) {

        if (typeof schema.propertyNames === 'boolean') {

          additionalPropertiesPropertyName = {
            isPattern: true,
            name: new RegExp(schema.propertyNames ? /.*/ : /^(?!.+)$/),
          };

        } else if (schema.propertyNames.pattern) {
          additionalPropertiesPropertyName = {
            isPattern: true,
            name: new RegExp(schema.propertyNames.pattern),
          };
        } else if (schema.propertyNames.const) {
          additionalPropertiesPropertyName = String(schema.propertyNames.const);
        }
      }

      if (additionalPropertiesPropertyName === undefined) {
        additionalPropertiesPropertyName = {
          isPattern: true,
          name: /.*/,
        };
      }

      properties.push({
        kind: OmniItemKind.PROPERTY,
        name: additionalPropertiesPropertyName,
        type: additionalPropertiesType,
      });
    }

    type.properties = properties;

    if (extendedBy && this.canBeReplacedBy(type, extendedBy)) {

      // TODO: This should be removed and placed inside a parser-agnostic transformer
      // Simplify empty types by only returning the inner content.
      const newType: OmniType = {
        ...extendedBy,
        description: extendedBy.description || type.description,
        summary: extendedBy.summary || type.summary,
        title: extendedBy.title || type.title,
      };

      // TODO: A bit ugly? Is there a better way, or just a matter of introducing a helper method that does it for us?
      if ('name' in newType || (OmniUtil.isComposition(newType) && !newType.inline) || newType.kind == OmniTypeKind.INTERFACE) {

        // The name should be kept the same, since it is likely much more specific.
        newType.name = type.name;
      }

      return newType;
    }

    // NOTE: "extendedBy" could be an ENUM, while "type" is an Object.
    // This is not allowed in some languages. But it is up to the target language to decide how to handle it.
    if (extendedBy) {

      if (!OmniUtil.asSuperType(extendedBy)) {
        throw new Error(`Not allowed to use '${OmniUtil.describe(extendedBy)}' as a super-type`);
      }

      type.extendedBy = extendedBy;
    }

    return type;
  }

  /**
   * If the schema is "any", then for the case of AdditionalProperties we can restrict it into being a dictionary/object/map.
   */
  private normalizeAdditionalPropertiesType(type: OmniType): OmniType {

    if (type.kind === OmniTypeKind.UNKNOWN && type.unknownKind === UnknownKind.ANY) {
      // AdditionalProperties cannot be a primitive, it is always known to be an object of perhaps unknown contents.
      // So it is more accurate to say that it is a DYNAMIC_OBJECT rather than `ANY`
      return {...type, unknownKind: UnknownKind.DYNAMIC_OBJECT};
    } else {
      return type;
    }
  }

  private jsonSchemaToNonObjectType(
    schema: AnyJsonDefinition,
    ownerSchema: AnyJSONSchema | undefined,
    name: TypeName,
    id: string,
    extendedBy: OmniType | undefined,
    defaultType: OmniType | undefined,
    schemaType: JSONSchema9TypeName | undefined,
  ): OmniType | undefined {

    if (typeof schema === 'boolean') {

      if (schema) {
        return {kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.ANY, debug: 'Given from Boolean.TRUE schema'};
      } else {

        // Should be like a "not any" -- but unsure how well it will work.
        // Maybe there is a need for a "never" kind
        return {
          kind: OmniTypeKind.NEGATION,
          types: [
            {kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.ANY},
          ],
          debug: 'Given from Boolean.FALSE schema',
        };
      }
    } else if (schemaType === undefined && extendedBy) {

      logger.silent(`No schema type found for ${schema.$id}, will check if can be deduced by: ${OmniUtil.describe(extendedBy)}`);

      extendedBy = OmniUtil.getUnwrappedType(extendedBy);
      if (OmniUtil.isComposition(extendedBy)) {
        if (extendedBy.kind == OmniTypeKind.INTERSECTION) {

          // TODO: Allow XOR here? Since if all are primitive, that means they are the same
          const primitiveTypes: OmniPrimitiveType[] = [];
          const otherTypes: OmniType[] = [];
          const objectTypes: OmniObjectType[] = [];

          for (const superType of extendedBy.types) {

            if (OmniUtil.isPrimitive(superType)) {
              primitiveTypes.push(superType);
            } else {
              otherTypes.push(superType);
              if (superType.kind == OmniTypeKind.OBJECT) {
                objectTypes.push(superType);
              }
            }
          }

          // TODO: Replace any primitive 'number' types with the best other distinct number type: decimal, double, float, integer, integer_small (in that order)

          let bestPrimitiveNumberKind: OmniPrimitiveKinds | undefined = undefined;
          const indexesToReplace: number[] = [];
          for (let i = 0; i < primitiveTypes.length; i++) {
            if (OmniUtil.isNumericType(primitiveTypes[i])) {
              if (primitiveTypes[i].implicit) {
                indexesToReplace.push(i);
              } else {
                const score = OmniUtil.getPrimitiveNumberCoverageScore(primitiveTypes[i].kind);
                if (!bestPrimitiveNumberKind || score > OmniUtil.getPrimitiveNumberCoverageScore(bestPrimitiveNumberKind)) {
                  bestPrimitiveNumberKind = primitiveTypes[i].kind;
                }
              }
            }
          }

          if (bestPrimitiveNumberKind && indexesToReplace.length > 0) {
            for (let i = 0; i < indexesToReplace.length; i++) {

              // Overwrite any guessed primitive kinds with a definitive primitive kind.
              primitiveTypes[indexesToReplace[i]].kind = bestPrimitiveNumberKind;
            }
          }

          const uniquePrimitiveKinds = new Set(
            primitiveTypes.map(it => it.kind),
          );

          logger.silent(`Found ${primitiveTypes.length} - ${otherTypes.length} - ${objectTypes.length}`);

          if (otherTypes.length == 0 && primitiveTypes.length > 0 && uniquePrimitiveKinds.size == 1) {

            let merged = {...primitiveTypes[0]};
            for (let i = 1; i < primitiveTypes.length; i++) {
              logger.debug(`Merging ${OmniUtil.describe(primitiveTypes[i])} into ${OmniUtil.describe(merged)}`);
              merged = OmniUtil.mergeType(primitiveTypes[i], merged, OMNI_GENERIC_FEATURES);
            }

            merged.description = schema.description || merged.description;
            merged.title = schema.title || merged.title;

            logger.debug(`Figured out that 'type'-less ${schema.$id} is a ${OmniUtil.describe(merged)} based on super-type(s)`);

            return merged;
          } else if (objectTypes.length > 0) {

            // The schema does not have a 'type' -- but at least one of the AND types is an object, so then the whole thing is an object.
            // So we will not return it as a non-object and let it be handled by the object code.
            return undefined;
          } else if (otherTypes.length > 0 && primitiveTypes.length > 0 && !this.hasActualContent(schema)) {

            // The schema itself does not have any content, so we will just return the extension as-is.
            return extendedBy;
          }
        } else if (extendedBy.kind === OmniTypeKind.UNION) {

          if (!this.hasDirectContent(schema)) {
            return extendedBy;
          }
        }
      }

      if (OmniUtil.isPrimitive(extendedBy) || extendedBy.kind == OmniTypeKind.ARRAY || extendedBy.kind == OmniTypeKind.ENUM) {
        if (this.hasDirectContent(schema)) {
          return this.createDecoratedType(schema, extendedBy, name);
        } else {
          return extendedBy;
        }
      }
    } else if (schemaType === 'array' || schema.items !== undefined) {
      return this.toArrayType(schema, schema.items, schema.additionalItems, schema.unevaluatedItems, name);
    } /* else if (schema.properties || schema.additionalProperties || schema.propertyNames || schema.patternProperties) {
      // Only objects can have properties
      return undefined;
    } else*/
    if (schemaType !== 'object') {

      const investigatedType = this.investigateSchemaType(schema, extendedBy, defaultType, schemaType);
      if (!investigatedType) {

        // If we could not figure out a type, then we will presume it is an object.
        return undefined;
      }

      const primitiveType = this.toPrimitive(schema, investigatedType.type, name, id, ownerSchema, extendedBy, defaultType);
      if (investigatedType.implicit) {
        primitiveType.implicit = investigatedType.implicit;
      }

      return primitiveType;
    }

    return undefined;
  }

  private investigateSchemaType(
    schema: AnyJSONSchema,
    extendedBy: OmniType | undefined,
    defaultType: OmniType | undefined,
    schemaType: JSONSchema9TypeName | undefined,
  ): { type: JsonSchemaTypeWithAny, implicit: boolean } | undefined {

    if (schemaType) {
      return {type: schemaType, implicit: false};
    }

    const typeFromExtension = JsonSchemaParser.omniTypeToJsonSchemaType(schema, extendedBy);
    if (typeFromExtension) {
      return {type: typeFromExtension, implicit: true};
    }

    const typeFromDefault = JsonSchemaParser.omniTypeToJsonSchemaType(schema, defaultType);
    if (typeFromDefault) {
      return {type: typeFromDefault, implicit: true};
    }

    const typeFromEnum: JSONSchema9TypeName[] = schema.enum
      ? ([...new Set(schema.enum.map(it => {
        const javaType = typeof it;
        if (javaType == 'bigint') {
          return 'number';
        } else if (javaType == 'symbol' || javaType == 'function') {
          return 'object';
        } else if (javaType == 'undefined') {
          return 'null';
        }

        return javaType;
      }))])
      : [];

    if (typeFromEnum.length > 0) {
      return {type: typeFromEnum[0], implicit: true};
    }

    return undefined;
  }

  private toPrimitive(
    schema: AnyJSONSchema,
    schemaType: JsonSchemaTypeWithAny,
    name: TypeName,
    id: string,
    ownerSchema: AnyJSONSchema | undefined,
    extendedBy: OmniType | undefined,
    defaultType: OmniType | undefined,
  ): OmniType {

    let implicit = false;
    if (schemaType === undefined) {
      const investigated = this.investigateSchemaType(schema, extendedBy, defaultType, schemaType);
      if (investigated) {
        schemaType = investigated.type;
        implicit = investigated.implicit;
      }
    }

    if (schemaType === undefined) {
      throw new Error(`Must be given a type for ${Naming.unwrap(name)} to be able to create a primitive, since it has no extensions`);
    }

    const lcType = schemaType.toLowerCase();
    let primitiveKind: OmniPrimitiveKinds;
    if (lcType == 'null') {
      primitiveKind = OmniTypeKind.NULL;
    } else {
      primitiveKind = this.typeAndFormatToPrimitiveKind(lcType, (schema.format || '').toLowerCase() ?? '');
    }

    // TODO: `x-nullable` should perhaps be removed in favor of forcing contract to specify a union of `T | null`
    let isNullable = JsonSchemaParser.vendorExtensionToBool(schema, 'x-nullable', undefined);
    // () => {
    //   const possiblePropertyName = Naming.unwrap(name);
    //   return JsonSchemaParser.isRequiredProperty(ownerSchema, possiblePropertyName);
    // });

    if (schema.enum && schema.enum.length > 0) {
      return this.toOmniEnum(name, schemaType, primitiveKind, schema.enum, schema, schema.description, isNullable);
    }

    const isConst = ('const' in schema);
    const isNativeNull = (primitiveKind == OmniTypeKind.NULL || primitiveKind == OmniTypeKind.VOID);
    const isLiteral = isConst || isNativeNull;

    const primitiveType: OmniPrimitiveType = {
      name: name,
      kind: primitiveKind,
      implicit: implicit,
      literal: isLiteral,
      description: schema.description,
      examples: schema.examples ? this.toOmniExamples(schema.examples) : undefined,
    };

    if ('const' in schema) {
      primitiveType.value = schema.const;
    } else if (defaultType && OmniUtil.isPrimitive(defaultType) && defaultType.value !== undefined) {
      primitiveType.value = defaultType.value;
    }

    if (isNullable === undefined) {
      if (isConst) {
        isNullable = (primitiveType.value === null);
      } else if (isNativeNull) {
        isNullable = true;
      }
    }

    if (isNullable !== undefined) {
      primitiveType.nullable = isNullable;
    }

    return primitiveType;
  }

  private static omniTypeToJsonSchemaType(schema: AnyJSONSchema, extendedBy: OmniType | undefined): JsonSchemaTypeWithAny {

    if (extendedBy) {
      switch (extendedBy.kind) {
        case OmniTypeKind.CHAR:
        case OmniTypeKind.STRING:
          return 'string';
        case OmniTypeKind.LONG:
        case OmniTypeKind.INTEGER:
        case OmniTypeKind.INTEGER_SMALL:
          return 'integer';
        case OmniTypeKind.NUMBER:
        case OmniTypeKind.DECIMAL:
        case OmniTypeKind.FLOAT:
        case OmniTypeKind.DOUBLE:
          return 'number';
        case OmniTypeKind.BOOL:
          return 'boolean';
        case OmniTypeKind.NULL:
          return 'null';
        case OmniTypeKind.UNKNOWN:
          return 'any';
      }
    }

    return undefined;
  }

  private toOmniExamples(jsonExamples: ToDefined<AnyJSONSchema['examples']>): OmniExample<unknown>[] {

    const examples: OmniExample<unknown>[] = [];
    if (Array.isArray(jsonExamples)) {

      for (const item of jsonExamples) {
        examples.push({kind: OmniItemKind.EXAMPLE, value: item});
      }

    } else {
      examples.push({kind: OmniItemKind.EXAMPLE, value: jsonExamples});
    }

    return examples;
  }

  private static isRequiredProperty(ownerSchema: AnyJSONSchema | undefined, propertyName: string): boolean {
    return ownerSchema !== undefined && ownerSchema.required !== undefined && Array.isArray(ownerSchema.required) && ownerSchema.required.includes(propertyName);
  }

  private static vendorExtensionToBool(object: unknown, key: string, fallback: boolean | undefined | (() => boolean | undefined)): boolean | undefined {

    if (object && typeof object == 'object' && key in object) {

      const value = (object as any)[key];
      if (value !== undefined) {
        logger.trace(`Found vendor extension '${key}' as '${value}'`);
        if (typeof value == 'boolean') {
          return value;
        } else {
          throw new Error(`Vendor extension ${key} must be a boolean`);
        }
      }
    }

    if (fallback && typeof fallback === 'function') {
      return fallback();
    }

    return fallback;
  }

  private hasActualContent(schema: AnyJSONSchema): boolean {

    for (const [k, v] of Object.entries(schema)) {
      if (CONTENT_PROPERTIES.includes(k) && v !== undefined) {
        return true;
      }
    }

    return false;
  }

  private hasDirectContent(schema: AnyJSONSchema): boolean {

    const propertiesCount = Object.keys(schema).filter(k => {
      if (DISREGARDED_PROPERTIES.includes(k)) {
        return false;
      }

      return ((schema as any)[k]) !== undefined;
    });

    return propertiesCount.length > 0;
  }

  private createDecoratedType(schema: AnyJSONSchema, inner: OmniType, name: TypeName): OmniDecoratingType {

    return {
      kind: OmniTypeKind.DECORATING,
      of: inner,
      description: schema.description,
      title: schema.title,
      name: name,
    };
  }

  private toOmniPropertyFromJsonSchema(
    owner: OmniPropertyOwner,
    propertyName: string,
    schemaOrRef: AnyJsonDefinition,
    schemaOwner: AnyJSONSchema,
  ): OmniProperty {

    // The type name will be replaced if the schema is a $ref to another type.
    const resolvedSchema = this._refResolver.resolve(schemaOrRef);

    const preferredName = this.getPreferredName(
      schemaOrRef,
      resolvedSchema,
      // NOTE: This might not be the best way to create the property name
      // But for now it will have to do, since most type names will be a simple type.
      {
        prefix: OmniUtil.getVirtualTypeName(owner),
        name: Case.pascal(propertyName),
      },
    );

    let propertyType: SchemaToTypeResult;
    try {
      propertyType = this.jsonSchemaToType(preferredName, resolvedSchema, schemaOwner);
    } catch (ex) {
      throw new Error(`Could not convert json schema of property '${propertyName}' from ${schemaOwner.$id} to omni type, because: ${ex}`, {cause: ex});
    }

    const property: OmniProperty = {
      kind: OmniItemKind.PROPERTY,
      name: JsonSchemaParser.getPreferredPropertyName(resolvedSchema, propertyName, this._options),
      type: propertyType.type,
      description: this.getSchemaProperty(resolvedSchema, obj => obj.description),
    };

    // TODO: This is a bad solution. `OmniType` needs to keep track of `readOnly`/`writeOnly` itself, and merge them based on `allOf` et cetera.
    //        Because right now we do not have access to the actual schemas that created the property's type, so can't check `readOnly` properly.
    //        This is especially true inside OpenRpcParser which have even worse access to the original schema
    JsonSchemaParser.updateProperty(resolvedSchema, schemaOwner, property, propertyName);

    return property;
  }

  public static getPreferredPropertyName(resolvedSchema: JSONSchema9 | boolean, propertyName: string, options: ParserOptions): OmniPropertyName {

    const fieldName = JsonSchemaParser.getVendorExtension<string>(resolvedSchema, 'field-name');
    const visualName = JsonSchemaParser.getVendorExtension<string>(resolvedSchema, 'property-name');

    const nameObject: OmniPropertyName = {
      name: propertyName,
    };
    if (fieldName) {
      nameObject.fieldName = fieldName;
    }
    if (visualName) {
      nameObject.propertyName = visualName;
    }

    if (!nameObject.propertyName && options.propertyNameMapper) {
      const mappedName = options.propertyNameMapper(propertyName);
      if (mappedName) {
        nameObject.propertyName = mappedName;

        if (!nameObject.fieldName) {
          // Should this even be needed? Or should other code assume that since `propertyName` is set, the field should try to follow that name?
          // Then it is also up to that code to annotate the field with the original (de)serialization name.
          const camelName = Case.camel(mappedName, {
            preserveConsecutiveUppercase: true,
          });
          logger.trace(`Mapping field name from '${propertyName}' -> '${mappedName}' -> '${camelName}'`);

          nameObject.fieldName = camelName;
        }
      }
    }

    return (nameObject.fieldName || nameObject.propertyName) ? nameObject : propertyName;
  }

  public static updateProperty(propertySchema: JSONSchema9Definition, objectSchema: JSONSchema9 | undefined, property: OmniProperty, propertyName: string) {

    const schemas: JSONSchema9[] = [];
    if (typeof propertySchema === 'object') {
      schemas.push(propertySchema);
      if (propertySchema.allOf) {
        for (const superType of propertySchema.allOf) {
          if (typeof superType === 'object') {
            schemas.push(superType);
          }
        }
      }
    }

    if (objectSchema) {
      schemas.push(objectSchema);
    }

    for (const schema of schemas) {
      if (property.readOnly === undefined && schema.readOnly !== undefined) {
        property.readOnly = schema.readOnly;
        property.debug = OmniUtil.addDebug(property.debug, `Setting ReadOnly=${schema.readOnly} from schema`);
      }
      if (property.writeOnly === undefined && schema.writeOnly !== undefined) {
        property.writeOnly = schema.writeOnly;
        property.debug = OmniUtil.addDebug(property.debug, `Setting WriteOnly=${schema.writeOnly} from schema`);
      }
    }

    if (JsonSchemaParser.vendorExtensionToBool(propertySchema, 'x-abstract', false)) {
      property.abstract = true;
      property.debug = OmniUtil.addDebug(property.debug, `Setting abstract because of x-abstract=true`);
    }

    if (JsonSchemaParser.isRequiredProperty(objectSchema, propertyName)) {
      property.required = true;
      property.debug = OmniUtil.addDebug(property.debug, `Setting required=true because schema said so`);
    }
  }

  private getSchemaProperty<R>(def: AnyJsonDefinition, mapper: (obj: AnyJSONSchema) => R): R | undefined {

    if (typeof def == 'boolean') {
      return undefined;
    }

    return mapper(def);
  }

  public getSpecifiedNames(
    schema: AnyJsonDefinition,
    dereferenced: AnyJsonDefinition,
  ): TypeName[] {

    const names: TypeName[] = [];
    if (typeof schema == 'object') {
      if (schema.title && !names.includes(schema.title)) {
        names.push(schema.title);
      }
    }

    if (typeof dereferenced === 'object' && dereferenced !== schema) {
      if (dereferenced.title && !names.includes(dereferenced.title)) {
        names.push(dereferenced.title);
      }
    }

    return names;
  }

  public getLikelyNames(
    schema: AnyJsonDefinition,
    dereferenced: AnyJsonDefinition,
  ): TypeName[] | undefined {

    const names = this.getSpecifiedNames(schema, dereferenced);

    if (typeof dereferenced === 'object') {
      if (dereferenced.$id) {
        names.push(dereferenced.$id);
      }
    }

    if (typeof schema == 'object') {
      if (schema.$ref) {
        names.push(schema.$ref);
      }

      if (schema !== dereferenced) {
        if (schema.$id && !names.includes(schema.$id)) {
          names.push(schema.$id);
        }
      }
    }

    if (names.length == 0) {
      return undefined;
    }

    return names;
  }

  public getPreferredName(
    schema: AnyJsonDefinition,
    dereferenced: AnyJsonDefinition,
    fallback?: TypeName | undefined,
  ): TypeName {

    const names = this.getLikelyNames(schema, dereferenced) ?? [];

    if (fallback && !names.includes(fallback)) {
      names.push(fallback);
    }

    for (const fallbackName of this.getFallbackNamesOfJsonSchemaType(schema)) {
      if (!names.includes(fallbackName)) {
        names.push(fallbackName);
      }
    }

    return names;
  }

  /**
   * TODO: Remove, and figure out another way where this is not used prematurely. Should be up to the final user of the name to pick a suitable fallback
   */
  public getFallbackNamesOfJsonSchemaType(schema: AnyJsonDefinition): TypeName[] {

    const names: TypeName[] = [];
    if (typeof schema == 'object' && schema.type) {
      if (Array.isArray(schema.type)) {
        names.push(Case.pascal(schema.type.join('_')));
      } else {
        if (schema.type) {
          names.push(Case.pascal(schema.type));
        }
      }
    }

    return names;
  }

  /**
   * TODO: This should be removed and placed inside a parser-agnostic transformer
   */
  private canBeReplacedBy(type: OmniObjectType, extension: OmniType): boolean {

    if (OmniUtil.isEmptyType(type)) {
      if (extension.kind === OmniTypeKind.EXCLUSIVE_UNION || extension.kind === OmniTypeKind.UNION) {
        return true;
      }
    }

    return false;
  }

  public static getVendorExtension<R>(obj: unknown, key: string): R | undefined {

    if (typeof obj !== 'object') {
      return undefined;
    }

    if (obj && 'obj' in obj && 'root' in obj) {
      throw new Error(`You seem to have given a dereference object, when you should give the inner object.`);
    }

    const records = obj as Record<string, unknown>;
    const value = records[`x-${key}`];
    if (value == undefined) {
      return undefined;
    }

    return value as R;
  }

  private static _uniqueCounter = 0;

  private typeAndFormatToPrimitiveKind(lcType: string, lcFormat: string): OmniPrimitiveKinds {

    switch (lcType) {
      case 'number':
        switch (lcFormat) {
          case 'decimal':
            return OmniTypeKind.DECIMAL;
          case 'double':
            return OmniTypeKind.DOUBLE;
          case 'float':
            return OmniTypeKind.FLOAT;
          default:
            return this.getIntegerPrimitiveFromFormat(lcFormat, OmniTypeKind.NUMBER);
        }
      case 'integer':
        return this.getIntegerPrimitiveFromFormat(lcFormat, OmniTypeKind.INTEGER);
      case 'boolean':
        return OmniTypeKind.BOOL;
      case 'string':
        switch (lcFormat) {
          case 'char':
          case 'character':
            return OmniTypeKind.CHAR;
          default:
            return OmniTypeKind.STRING;
        }
      default:
        if (this._options.relaxedUnknownTypes) {
          logger.warn(`Do not know what given schema type '${lcType}' is, so will assume String`);
          return OmniTypeKind.STRING;
        } else {
          throw new Error(`Invalid schema type '${lcType}' given, do not know how to translate into a known type`);
        }
    }
  }

  private toOmniEnum(
    name: TypeName,
    schemaType: JsonSchemaTypeWithAny,
    primitiveKind: OmniTypeKind,
    enumValues: JSONSchema9Type[],
    enumOwner?: AnyJSONSchema,
    description?: string,
    nullable?: boolean,
  ): OmniEnumType {

    let enumMembers: OmniEnumMember[];
    if (primitiveKind === OmniTypeKind.STRING) {
      enumMembers = enumValues.map(it => ({kind: OmniItemKind.ENUM_MEMBER, value: `${String(it)}`}));
    } else if (OmniUtil.isNumericKind(primitiveKind)) {
      enumMembers = enumValues.map(it => ({kind: OmniItemKind.ENUM_MEMBER, value: Number.parseFloat(`${String(it)}`)}));
    } else {
      enumMembers = enumValues.map(it => ({kind: OmniItemKind.ENUM_MEMBER, value: Number.parseInt(`${String(it)}`)}));
      primitiveKind = OmniTypeKind.STRING;
    }

    const enumNames = JsonSchemaParser.getEnumNames(enumOwner, enumMembers, name);
    const enumDescriptions = JsonSchemaParser.getEnumDescriptions(enumOwner, enumMembers, name);

    // TODO: Try to convert the ENUM values into the specified primitive type.
    const omniEnum: OmniEnumType = {
      name: name ?? schemaType,
      kind: OmniTypeKind.ENUM,
      itemKind: primitiveKind,
      members: enumMembers,
      description: description,
    };

    if (nullable !== undefined) {
      omniEnum.nullable = nullable;
    }

    if (enumNames) {
      for (const [key, value] of Object.entries(enumNames)) {
        const found = enumMembers.find(it => String(it.value) === key);
        if (found) {
          found.name = value;
        }
      }
    }

    if (enumDescriptions) {
      for (const [key, value] of Object.entries(enumDescriptions)) {
        const found = enumMembers.find(it => (it.name && it.name === key) || String(it.value) === key);
        if (found) {
          found.description = value;
        }
      }
    }

    return omniEnum;
  }

  private static getEnumDescriptions(enumOwner: JSONSchema9 | undefined, enumMembers: OmniEnumMember[], name: any): Record<string, string> | undefined {

    let enumDescriptions: Record<string, string> | undefined = undefined;
    if (enumOwner && 'x-enum-descriptions' in enumOwner) {

      const varDescriptions = enumOwner['x-enum-descriptions'];
      if (Array.isArray(varDescriptions)) {

        enumDescriptions = {};
        for (let i = 0; i < varDescriptions.length; i++) {
          const key = String(enumMembers[i].value);
          const value = String(varDescriptions[i]);
          logger.trace(`Setting ${key} description to: ${value}`);
          enumDescriptions[key] = value;
        }

      } else if (varDescriptions && typeof varDescriptions == 'object') {

        enumDescriptions = {};
        for (const [key, value] of Object.entries(varDescriptions)) {
          logger.trace(`Setting ${key} description to: ${value}`);
          enumDescriptions[key] = String(value);
        }

      } else {
        throw new Error(`x-enum-descriptions of ${Naming.unwrap(name)} must be an array or [string: string] record mapping`);
      }
    }

    return enumDescriptions;
  }

  private static getEnumNames(enumOwner: JSONSchema9 | undefined, enumMembers: OmniEnumMember[], name: any): Record<string, string> | undefined {
    let enumNames: Record<string, string> | undefined = undefined;
    if (enumOwner && 'x-enum-varnames' in enumOwner) {

      const varDescriptions = enumOwner['x-enum-varnames'];
      if (Array.isArray(varDescriptions)) {

        enumNames = {};
        for (let i = 0; i < varDescriptions.length; i++) {
          const key = String(enumMembers[i].value);
          const value = String(varDescriptions[i]);
          logger.trace(`Setting ${key} enum name to: ${value}`);
          enumNames[key] = value;
        }

      } else if (varDescriptions && typeof varDescriptions == 'object') {

        enumNames = {};
        for (const [key, value] of Object.entries(varDescriptions)) {
          logger.trace(`Setting ${key} enum name to: ${value}`);
          enumNames[key] = String(value);
        }

      } else {
        throw new Error(`x-enum-varnames of ${Naming.unwrap(name)} must be an array or [string: string] record mapping`);
      }
    }

    // if (enumOwner && 'x-enum-varnames' in enumOwner) {
    //
    //   const varNames = enumOwner['x-enum-varnames'];
    //   if (Array.isArray(varNames)) {
    //
    //     enumNames = [];
    //     for (const varName of varNames) {
    //       enumNames.push(`${varName}`);
    //     }
    //
    //   } else {
    //     throw new Error(`x-enum-varnames of ${Naming.unwrap(name)} must be an array`);
    //   }
    // }

    return enumNames;
  }

  // private getLiteralValueOfSchema(schema: JSONSchema9Type): OmniPrimitiveConstantValue | null | undefined {
  //
  //   if (typeof schema == 'string') {
  //     return schema;
  //   } else if (typeof schema == 'number') {
  //     return schema;
  //   } else if (typeof schema == 'boolean') {
  //     return schema;
  //   }
  //
  //   // TODO: How should we handle if an object or a whole schema structure is given here?
  //   //        That should be possible to be used as a literal constant as well, no?
  //   return undefined;
  // }

  private getIntegerPrimitiveFromFormat(
    format: string,
    fallback: typeof OmniTypeKind.INTEGER | typeof OmniTypeKind.NUMBER,
  ): OmniPrimitiveKinds {

    switch (format) {
      case 'integer':
      case 'int':
        return OmniTypeKind.INTEGER;
      case 'long':
      case 'int64':
        return OmniTypeKind.LONG;
      default:
        return fallback;
    }
  }

  private getExtendedBy(
    schema: AnyJsonDefinition,
    name: TypeName,
  ): OmniType | undefined {

    if (typeof schema == 'boolean') {
      return undefined;
    }

    const compositionsAllOfAnd: OmniType[] = [];

    if (schema.if) {

      // TODO: This is incorrect and need to fully support predicated types. But for now this will have to do.

      const types: OmniType[] = [];
      if (schema.then) {
        const resolved = this._refResolver.resolve(schema.then);
        const preferredName = this.getPreferredName(schema.then, resolved, name);
        types.push(this.jsonSchemaToType(preferredName, resolved).type);
      }

      if (schema.else) {
        const resolved = this._refResolver.resolve(schema.else);
        const preferredName = this.getPreferredName(schema.else, resolved, name);
        types.push(this.jsonSchemaToType(preferredName, resolved).type);
      }

      if (types.length > 1) {
        compositionsAllOfAnd.push({
          kind: OmniTypeKind.UNION,
          inline: false,
          types: types,
        });
      } else if (types.length === 1) {
        compositionsAllOfAnd.push(types[0]);
      } else {
        logger.warn(`Found 'if' without an 'then' or 'else'`);
      }
    }

    const compositionsOneOfOr: OmniType[] = [];
    const compositionsAnyOfOr: OmniType[] = [];
    let compositionsNot: OmniType | undefined;

    if (schema.oneOf) {
      for (const entry of schema.oneOf) {
        const resolved = this._refResolver.resolve(entry);
        const preferredName = this.getPreferredName(entry, resolved, name);
        compositionsOneOfOr.push(this.jsonSchemaToType(preferredName, resolved).type);
      }
    }

    if (schema.allOf) {
      for (const entry of schema.allOf) {
        const resolved = this._refResolver.resolve(entry);
        const preferredName = this.getPreferredName(entry, resolved, name);
        const omniType = this.jsonSchemaToType(preferredName, resolved).type;
        omniType.inline = (resolved === entry);
        if (this._options.debug && omniType.inline) {
          omniType.debug = OmniUtil.addDebug(omniType.debug, `Made inline since the 'allOf' entry was inline in the spec`);
        }
        compositionsAllOfAnd.push(omniType);
      }
    }

    if (schema.anyOf) {
      for (const entry of schema.anyOf) {
        const resolved = this._refResolver.resolve(entry);
        const preferredName = this.getPreferredName(entry, resolved, name);
        compositionsAnyOfOr.push(this.jsonSchemaToType(preferredName, resolved).type);
      }
    }

    // TODO: This is wrong -- it needs to be done in order
    // if (schema.not !== undefined) {
    //
    //   const resolved = this._refResolver.resolve(schema.not);
    //   const preferredName = this.getPreferredName(schema.not, resolved, name);
    //   compositionsNot = (this.jsonSchemaToType(preferredName, resolved)).type;
    // }

    const composition = CompositionUtil.getCompositionOrExtensionType(
      compositionsAnyOfOr,
      compositionsAllOfAnd,
      compositionsOneOfOr,
      compositionsNot,
    );

    if (OmniUtil.isComposition(composition) && !composition.name && !this.hasActualContent(schema)) {

      // This is a name that might not be the best suitable one. Might need to be more restrictive, or send more information along with the type.
      // For the name to be decided later by the target.
      composition.name = this.getLikelyNames(schema, schema);
      composition.description = schema.description;
    }

    return composition;
  }

  /**
   * NOTE: This is not JsonSchema -- it is OpenApi and/or OpenRpc -- it does not belong here!
   */
  private getDiscriminatorAware(schema: AnyJsonDefinition | DiscriminatorAwareSchema): (AnyJSONSchema & DiscriminatorAware) | undefined {

    if (typeof schema == 'boolean') {
      return undefined;
    }

    if ('discriminator' in schema) {
      return schema as typeof schema & DiscriminatorAware;
    }

    return undefined;
  }

  private getSubTypeHints(schema: DiscriminatorAwareSchema): { hints: OmniSubTypeHint[] | undefined, postDiscriminatorNeeded: boolean } {

    const subTypeHints: OmniSubTypeHint[] = [];

    if (typeof schema == 'boolean') {
      return {hints: undefined, postDiscriminatorNeeded: false};
    }

    const mapping = schema.discriminator.mapping;
    const discriminatorPropertyName = schema.discriminator.propertyName;

    if (mapping) {

      // We have manual mappings. That's good, makes things a bit easier.
      // If we receive a propertyName that is not in this mapping, then the type lookup must be done at runtime.
      // That should be done by building a ref to '#/components/schemas/${propertyValue}
      for (const key of Object.keys(mapping)) {
        const ref = mapping[key];
        try {

          const fakeRef: Required<Pick<AnyJSONSchema, '$ref'>> = {$ref: ref};
          const deref = this._refResolver.resolve(fakeRef);
          const typeResult = this.jsonSchemaToType(this.getId(deref) || ref, deref);

          subTypeHints.push({
            kind: OmniItemKind.SUBTYPE_HINT,
            type: typeResult.type,
            qualifiers: [
              {
                kind: OmniItemKind.PAYLOAD_PATH_QUALIFIER,
                path: [discriminatorPropertyName],
                operator: OmniComparisonOperator.EQUALS,
                value: key,
              },
            ],
          });

        } catch (ex) {
          throw new Error(`Could not find schema for mapping ${key}: '${ref}' --- ${String(ex)}`, {cause: ex});
        }
      }
    }

    let postDiscriminatorNeeded = false;
    const subSchemas = [...(schema.anyOf || []), ...(schema.oneOf || [])];
    if (subSchemas.length > 0) {

      // TODO: If if is "oneOf" and no other, then those should become SUB-TYPES! Make sure it is so!
      for (const subSchema of subSchemas) {

        const deref = this._refResolver.resolve(subSchema);
        const id = this.getId(deref);
        if (!id) {
          continue;
        }

        const lastSlashIndex = id.lastIndexOf('/');
        const supposedPropertyValue = id.substring(lastSlashIndex + 1);
        const existingMapping = subTypeHints.find(it => it.qualifiers.find(q => (q.value == supposedPropertyValue)));
        if (existingMapping) {
          continue;
        }

        const subType = this.jsonSchemaToType(id, deref).type;
        if (subTypeHints.find(it => it.type == subType)) {
          logger.debug(`Skipping ${discriminatorPropertyName} as ${OmniUtil.describe(subType)} since it has a custom key`);
          continue;
        }

        subTypeHints.push({
          kind: OmniItemKind.SUBTYPE_HINT,
          type: subType,
          qualifiers: [
            {
              kind: OmniItemKind.PAYLOAD_PATH_QUALIFIER,
              path: [discriminatorPropertyName],
              operator: OmniComparisonOperator.EQUALS,
              value: supposedPropertyValue,
            },
          ],
        });

      }
    } else {

      // This schema does not contain any sub-schemas, so we cannot know which types that uses this schema.
      // HOWEVER, we can do that in post, after all other processing has been done.
      // NOTE: It might be beneficial to do this every time, even if there are sub-schemas provided.
      if (this._options.autoTypeHints) {
        postDiscriminatorNeeded = true;
      }
    }

    return {hints: (subTypeHints.length == 0) ? undefined : subTypeHints, postDiscriminatorNeeded};
  }

  private getId(schema: AnyJsonDefinition): string | undefined {

    if (typeof schema == 'boolean') {
      return undefined;
    }

    return schema.$id; // || ('id' in schema ? schema.id : undefined);
  }

  private toArrayType(
    schema: AnyJsonDefinition,
    items: AnyJSONSchema['items'],
    additionalItems: AnyJSONSchema['additionalItems'],
    unevaluatedItems: AnyJSONSchema['unevaluatedItems'],
    name: TypeName | undefined,
  ): OmniArrayTypes {

    if (typeof schema == 'boolean') {
      throw new Error(`The schema object should not be able to be a boolean`);
    }

    if (items === undefined || typeof items == 'boolean') {
      // No items, so the schema for the array items is undefined.
      return {
        kind: OmniTypeKind.ARRAY,
        minLength: schema.minItems,
        maxLength: schema.maxItems,
        description: schema.description,
        of: {
          kind: OmniTypeKind.UNKNOWN,
        },
      };

    } else if (Array.isArray(items)) {

      // TODO: We should be introducing interfaces that describe the common denominators between the different items?
      // TODO: This needs some seriously good implementation on the code-generator side of things.
      // TODO: What do we do here if the type can be inlined? Just ignore I guess?

      const staticArrayTypes = items.map(it => {
        const derefArrayItem = this._refResolver.resolve(it);
        // NOTE: The name below is probably extremely wrong. Fix once we notice a problem.
        return this.jsonSchemaToType(this.getId(derefArrayItem) || 'UnknownArrayItem', derefArrayItem);
      });

      const commonDenominator = OmniUtil.getCommonDenominator(OMNI_GENERIC_FEATURES, staticArrayTypes.map(it => it.type))?.type;

      return {
        kind: OmniTypeKind.TUPLE,
        types: staticArrayTypes.map(it => it.type),
        description: schema.description,
        commonDenominator: commonDenominator,
      } satisfies OmniTupleType;

    } else {

      const resolved = this._refResolver.resolve(items);
      const arrayItemTypeName = this.getLikelyNames(items, resolved);
      const arrayTypeName = name ?? arrayItemTypeName;
      const safeItemTypeName: TypeName | undefined = arrayItemTypeName
        ? arrayItemTypeName
        : (arrayTypeName ? {name: arrayTypeName, suffix: 'Item'} : undefined);

      const itemType = this.jsonSchemaToType(safeItemTypeName, resolved);

      return {
        kind: OmniTypeKind.ARRAY,
        arrayKind: OmniArrayKind.LIST,
        name: arrayTypeName,
        minLength: schema.minItems,
        maxLength: schema.maxItems,
        description: schema.description,
        of: itemType.type,
      };
    }
  }

  public transformErrorDataSchemaToOmniType(name: string, schema: AnyJSONSchema | undefined, docStore: DocumentStore): OmniType | undefined {

    if (!schema) {
      return schema;
    }

    // The type is a JSONSchema7, though the type system seems unsure of that fact.
    let derefJsonSchema = this._refResolver.resolve(schema);
    if (!derefJsonSchema.$id) {
      derefJsonSchema.$id = derefJsonSchema.title ?? name;
    }

    derefJsonSchema = JsonSchemaParser.preProcessJsonSchema(undefined, derefJsonSchema, docStore);

    const omniType = this.jsonSchemaToType(undefined, derefJsonSchema).type;
    logger.debug(`Using the from jsonschema converted OmniType '${OmniUtil.describe(omniType)}'`);
    return omniType;
  }

  public executePostCleanup(model: OmniModel): void {

    // Let's do the discriminator mapping which could not be done earlier in the process.
    // If we got here, then the type does not have any other mappings specified.
    for (const postDiscriminator of this.getPostDiscriminatorMappings()) {

      if (typeof postDiscriminator.schema == 'boolean') {
        continue;
      }

      const inheritors = OmniUtil.getTypesThatInheritFrom(model, postDiscriminator.type);
      const propertyName = postDiscriminator.schema.discriminator.propertyName;

      const subTypeHints: OmniSubTypeHint[] = [];
      for (const inheritor of inheritors) {

        subTypeHints.push({
          kind: OmniItemKind.SUBTYPE_HINT,
          type: inheritor,
          qualifiers: [
            {
              kind: OmniItemKind.PAYLOAD_PATH_QUALIFIER,
              path: [propertyName],
              operator: OmniComparisonOperator.EQUALS,
              // TODO: This is VERY LIKELY INVALID! Must get the originating reference name or something!
              value: OmniUtil.getVirtualTypeName(inheritor),
            },
          ],
        });
      }

      if (subTypeHints.length > 0) {

        // TODO: Do not replace, instead add the new ones that we found.
        const existingHints = postDiscriminator.type.subTypeHints;
        if (existingHints) {
          const newSubTypeHints = subTypeHints.filter(it => {
            return !existingHints.find(existing => existing.type == it.type);
          });

          logger.info(`Adding ${newSubTypeHints.length} additional sub-type hints`);
          existingHints.push(...newSubTypeHints);

        } else {
          postDiscriminator.type.subTypeHints = subTypeHints;
        }
      }
    }
  }

  private getDefaultFromSchema(schema: AnyJsonDefinition, path: TypeName): OmniType | undefined {

    if (typeof schema !== 'boolean' && schema.default !== undefined) {
      return this.getDefault(schema.default, path);
    }

    return undefined;
  }

  private getDefault(def: AnyJSONSchema['default'], path: TypeName): OmniType | undefined {

    if (def === undefined) {
      return undefined;
    } else if (def === null) {
      return {kind: OmniTypeKind.NULL, literal: true, value: null};
    } else if (typeof def === 'string') {
      return {kind: OmniTypeKind.STRING, literal: true, value: def};
    } else if (typeof def === 'number') {
      return {kind: OmniTypeKind.NUMBER, literal: true, value: def};
    } else if (typeof def === 'boolean') {
      return {kind: OmniTypeKind.BOOL, literal: true, value: def};
    } else if (Array.isArray(def)) {
      return {
        kind: OmniTypeKind.TUPLE,
        arrayKind: OmniArrayKind.PRIMITIVE,
        types: def.map(it => this.getDefault(it, path)).filter(isDefined),
      };
    } else {

      const objectType: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: {name: path, suffix: 'default'}, properties: []};
      for (const [key, value] of Object.entries(def)) {

        const propertyName: TypeName = {name: objectType.name, suffix: key};
        const propertyType = this.getDefault(value, propertyName);
        if (!propertyType) {

          logger.warn(`Could not get an omni type from default object ${value} in ${Naming.unwrap(propertyName)}`);
          continue;
        }

        objectType.properties.push({
          kind: OmniItemKind.PROPERTY,
          name: key,
          type: propertyType,
        });
      }

      return objectType;
    }
  }
}
