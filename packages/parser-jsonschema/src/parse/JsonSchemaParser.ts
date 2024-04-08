import {
  AllowedEnumTsTypes,
  OMNI_GENERIC_FEATURES,
  OmniArrayKind,
  OmniArrayTypes,
  OmniTupleType,
  OmniComparisonOperator,
  OmniDecoratingType,
  OmniEnumType,
  OmniExample,
  OmniModel,
  OmniModelParserResult,
  OmniObjectType,
  OmniPrimitiveConstantValue,
  OmniPrimitiveKinds,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyName,
  OmniPropertyOwner,
  OmniSubTypeHint,
  OmniType,
  OmniTypeKind,
  Parser,
  ParserOptions,
  TypeName,
  UnknownKind,
} from '@omnigen/core';
import {JsonObject} from 'json-pointer';
import {LoggerFactory} from '@omnigen/core-log';
import {DiscriminatorAware} from './DiscriminatorAware.js'; // TODO: Move into OpenApiJsonSchemaParser
import {Case, CompositionUtil, isDefined, Naming, OmniUtil, SchemaFile, Util} from '@omnigen/core-util';
import {ApplyIdJsonSchemaTransformerFactory, SimplifyJsonSchemaTransformerFactory} from '../transform';
import {ExternalDocumentsFinder, RefResolver, ToDefined} from '../visit';
import Ajv2020, {ErrorObject} from 'ajv/dist/2020';
import {JsonSchemaMigrator} from '../migrate';
import {JSONSchema9, JSONSchema9Definition, JSONSchema9Type, JSONSchema9TypeName} from '../definitions';
import {JsonExpander} from '@omnigen/core-json';

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


export class NewJsonSchemaParser implements Parser {

  private readonly _schemaFile: SchemaFile;
  private readonly _parserOptions: ParserOptions;

  constructor(schemaFile: SchemaFile, parserOptions: ParserOptions) {
    this._schemaFile = schemaFile;
    this._parserOptions = parserOptions;
  }

  async parse(): Promise<OmniModelParserResult<ParserOptions>> {

    let root = await this._schemaFile.asObject<AnyJSONSchema>();
    root = JsonSchemaParser.preProcessJsonSchema(this._schemaFile.getAbsolutePath(), root);

    const model: OmniModel = {
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
      const omniTypeRes = jsonSchemaParser.jsonSchemaToType(schema[0], resolved);

      model.types.push(omniTypeRes.type);
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
export class JsonSchemaParser<TRoot extends JsonObject, TOpt extends ParserOptions> {

  // TODO: Move this to the root? But always have the key be the absolute path?
  private readonly _typeMap = new Map<string, OmniType>();
  private readonly _postDiscriminatorMapping: PostDiscriminatorMapping[] = [];

  private readonly _refResolver: RefResolver;

  private readonly _options: TOpt;

  constructor(refResolver: RefResolver, options: TOpt) {
    this._refResolver = refResolver;
    this._options = options;
  }

  public getTypes(): OmniType[] {
    return [...this._typeMap.values()];
  }

  public getPostDiscriminatorMappings(): PostDiscriminatorMapping[] {
    return this._postDiscriminatorMapping;
  }

  /**
   * Register a custom type as if it actually existed inside the schema.
   * Can be used to make sure that the type is found when converting from an OmniModel into a syntax tree.
   *
   * @param className The name of the class to register, it will be faked as having an uri in a document
   * @param type The type that should be force-registered
   */
  public registerCustomTypeManually(className: string, type: OmniType): void {
    this._typeMap.set(`#/custom/schemes/${className}`, type);
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
      throw new Error(`Encountered schema without ID: ${Util.getShallowPayloadString(schema)} (${name ? Naming.unwrap(name) : ''}); should have been assigned by schema transformers`);
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

    const extendedBy = this.getExtendedBy(schema, name);
    const defaultType = this.getDefaultFromSchema(schema, name);

    const omniType = this.jsonSchemaToNonObjectType(schema, ownerSchema, name, id, extendedBy, defaultType) ?? this.jsonSchemaToObjectType(schema, name, id, extendedBy);
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

    if (omniType.kind == OmniTypeKind.OBJECT) {

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

  public static preProcessJsonSchema(absolutePath: string | undefined, root: AnyJSONSchema): typeof root {

    // TODO: Add schema version migration, should support from 04 -> 2020

    const expander = new JsonExpander();
    expander.expand(root);

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

  private jsonSchemaToObjectType(schema: AnyJsonDefinition, name: TypeName, actualRef: string | undefined, extendedBy?: OmniType): OmniType {

    if (typeof schema == 'boolean') {
      throw new Error(`Not allowed`);
    }

    const names: TypeName = [name];

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
      abstract: this.vendorExtensionToBool(schema, 'x-abstract', false),
    };

    if (actualRef) {

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

        const additionalPropertiesType = this.jsonSchemaToType(propertyPattern, propertySchema, schema);

        properties.push({
          name: {
            isPattern: true,
            name: new RegExp(propertyPattern),
          },
          type: additionalPropertiesType.type,
          owner: type,
        });
      }
    }

    // additionalProperties is added last, as a fallthrough match. This ordering is important.
    const additionalProperties = schema.additionalProperties ?? this._options.defaultAdditionalProperties;
    if (additionalProperties) {

      const additionalPropertiesTypeName: TypeName = {name: names, suffix: 'AdditionalProperties'};
      const resolvedAdditional = this._refResolver.resolve(additionalProperties);
      const additionalPropertiesType = this.jsonSchemaToType(additionalPropertiesTypeName, resolvedAdditional, schema);

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
        name: additionalPropertiesPropertyName,
        type: additionalPropertiesType.type,
        owner: type,
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

  private jsonSchemaToNonObjectType(
    schema: AnyJsonDefinition,
    ownerSchema: AnyJSONSchema | undefined,
    name: TypeName,
    id: string,
    extendedBy?: OmniType,
    defaultType?: OmniType,
  ): OmniType | undefined {

    if (typeof schema == 'boolean') {

      if (schema) {
        return {kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.ANY};
      } else {

        // Should be like a "not any" -- but unsure how well it will work.
        // Maybe there is a need for a "never" kind
        return {
          kind: OmniTypeKind.NEGATION,
          types: [
            {kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.ANY},
          ],
        };
      }
    } else if (schema.type == undefined && extendedBy) {

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
              logger.info(`Merging ${OmniUtil.describe(primitiveTypes[i])} into ${OmniUtil.describe(merged)}`);
              merged = OmniUtil.mergeType(primitiveTypes[i], merged);
            }

            merged.description = schema.description || merged.description;
            merged.title = schema.title || merged.title;

            logger.info(`Figured out that 'type'-less ${schema.$id} is a ${OmniUtil.describe(merged)} based on super-type(s)`);

            return merged;
          } else if (objectTypes.length > 0) {

            // The schema does not have a 'type' -- but at least one of the AND types is an object, so then the whole thing is an object.
            // So we will not return it as a non-object and let it be handled by the object code.
            return undefined;
          }
        } else if (extendedBy.kind == OmniTypeKind.UNION) {

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
    } else if (schema.type === 'array' || schema.items !== undefined) {
      return this.toArrayType(schema, schema.items, schema.additionalItems, schema.unevaluatedItems, name);
    } else if (schema.properties || schema.additionalProperties || schema.propertyNames || schema.patternProperties) {
      // Only objects can have properties
      return undefined;
    } else if (schema.type !== 'object') {

      const investigatedType = this.investigateSchemaType(schema, extendedBy, defaultType);
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
  ): { type: AnyJSONSchema['type'] | 'any', implicit: boolean } | undefined {

    if (schema.type) {
      return {type: schema.type, implicit: false};
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
    schemaType: AnyJSONSchema['type'] | 'any',
    name: TypeName,
    id: string,
    ownerSchema: AnyJSONSchema | undefined,
    extendedBy: OmniType | undefined,
    defaultType: OmniType | undefined,
  ): OmniType {

    let implicit = false;
    if (schemaType === undefined) {
      const investigated = this.investigateSchemaType(schema, extendedBy, defaultType);
      if (investigated) {
        schemaType = investigated.type;
        implicit = investigated.implicit;
      }
    }

    if (schemaType === undefined) {
      throw new Error(`Must be given a type for ${Naming.unwrap(name)} to be able to create a primitive, since it has no extensions`);
    }

    if (Array.isArray(schemaType)) {

      if (schemaType.length == 1) {
        schemaType = schemaType[0];
      } else {

        // TODO: This will require more work, it is not correct. The properties of the owning schema is not propagated to the sub-types (like required, et cetera)
        const primitiveTypes: OmniType[] = schemaType.map(it => {
          if (it === 'object') {
            return this.jsonSchemaToObjectType(schema, name, id, extendedBy);
          } else {
            return this.toPrimitive({type: it}, undefined, {name: name, suffix: it}, id, ownerSchema, extendedBy, defaultType);
          }
        });

        return {
          kind: OmniTypeKind.EXCLUSIVE_UNION,
          types: primitiveTypes,
        };
      }
    }

    const enumValues = schema.enum;

    const lcType = schemaType.toLowerCase();
    let primitiveKind: OmniPrimitiveKinds;
    if (lcType == 'null') {
      primitiveKind = OmniTypeKind.NULL;
    } else {
      primitiveKind = this.typeAndFormatToPrimitiveKind(lcType, schema.format?.toLowerCase() ?? '');
    }

    if (enumValues && enumValues.length > 0) {
      return this.toOmniEnum(name, schemaType, primitiveKind, enumValues, schema, schema.description);
    }

    const isLiteral = ('const' in schema) || primitiveKind == OmniTypeKind.NULL || primitiveKind == OmniTypeKind.VOID;
    const isNullable = this.vendorExtensionToBool(schema, 'x-nullable', () => {
      const possiblePropertyName = Naming.unwrap(name);
      return this.isRequiredProperty(ownerSchema, possiblePropertyName);
    });

    const primitiveType: OmniPrimitiveType = {
      name: name,
      kind: primitiveKind,
      implicit: implicit,
      literal: isLiteral,
      nullable: isNullable,
      description: schema.description,
      examples: schema.examples ? this.toOmniExamples(schema.examples) : undefined,
    };

    if ('const' in schema) {
      primitiveType.value = schema.const;
    }

    return primitiveType;
  }

  private static omniTypeToJsonSchemaType(schema: AnyJSONSchema, extendedBy: OmniType | undefined): AnyJSONSchema['type'] | 'any' {

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
        examples.push({value: item});
      }

    } else {
      examples.push({value: jsonExamples});
    }

    return examples;
  }

  private isRequiredProperty(ownerSchema: AnyJSONSchema | undefined, propertyName: string): boolean {
    return ownerSchema !== undefined && ownerSchema.required !== undefined && Array.isArray(ownerSchema.required) && ownerSchema.required.includes(propertyName);
  }

  private vendorExtensionToBool(object: unknown, key: string, fallback: boolean | (() => boolean)): boolean {

    if (object && typeof object == 'object' && key in object) {

      const value = (object as any)[key];
      if (value !== undefined) {
        logger.debug(`Found vendor extension '${key}' as '${value}'`);
        if (typeof value == 'boolean') {
          return value;
        } else {
          throw new Error(`Vendor extension ${key} must be a boolean`);
        }
      }
    }

    if (typeof fallback == 'function') {
      return fallback();
    }

    return fallback;
  }

  private hasDirectContent(schema: AnyJSONSchema, ignoreIf?: Record<string, unknown>): boolean {

    const disregardedProperties: string[] = ['allOf', 'oneOf', 'anyOf', 'oneOf', 'not', '$id', 'type', 'default'] satisfies (keyof AnyJSONSchema)[];
    const propertiesCount = Object.keys(schema).filter(schemaKey => {
      if (disregardedProperties.includes(schemaKey)) {
        return false;
      }

      const schemaPropValue = (schema as any)[schemaKey];
      if (schemaPropValue === undefined) {
        return false;
      }

      if (ignoreIf && ignoreIf[schemaKey] == schemaPropValue) {
        return false;
      }

      return true;
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
    // const schema = this.unwrapJsonSchema(schemaOrRef);
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
      throw new Error(`Could not convert json schema of property '${propertyName}' from ${schemaOwner.$id} to omni type: ${ex}`, {cause: ex});
    }

    const property: OmniProperty = {
      name: {
        name: propertyName,
        fieldName: this.getVendorExtension(resolvedSchema, 'field-name'),
        propertyName: this.getVendorExtension(resolvedSchema, 'property-name'),
      },
      type: propertyType.type,
      owner: owner,
      description: this.getSchemaProperty(resolvedSchema, obj => obj.description),
    };

    if (typeof resolvedSchema == 'object') {
      if ('readOnly' in resolvedSchema && resolvedSchema.readOnly !== undefined && resolvedSchema.readOnly) {
        property.readOnly = true;
      }

      if ('writeOnly' in resolvedSchema && resolvedSchema.writeOnly !== undefined && resolvedSchema.writeOnly) {
        property.writeOnly = true;
      }
    }

    if (this.vendorExtensionToBool(resolvedSchema, 'x-abstract', false)) {
      property.abstract = true;
    }

    if (this.isRequiredProperty(schemaOwner, propertyName)) {
      property.required = true;
    }

    return property;
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
      if (schema.title) {
        names.push(schema.title);
      }
    }

    if (typeof dereferenced === 'object') {
      if (dereferenced.title) {
        names.push(dereferenced.title);
      }
    }

    return names;
  }

  public getLikelyNames(
    schema: AnyJsonDefinition,
    dereferenced: AnyJsonDefinition,
  ): TypeName[] {

    const names = this.getSpecifiedNames(schema, dereferenced);

    if (typeof schema == 'object') {
      if (schema.$id) {
        names.push(schema.$id);
      }

      if (schema.$ref) {
        names.push(schema.$ref);
      }
    }

    if (typeof dereferenced === 'object') {
      if (dereferenced.$id) {
        names.push(dereferenced.$id);
      }
    }

    return names;
  }

  public getPreferredName(
    schema: AnyJsonDefinition,
    dereferenced: AnyJsonDefinition,
    fallback?: TypeName | undefined,
  ): TypeName {

    const names = this.getLikelyNames(schema, dereferenced);

    if (fallback) {
      names.push(fallback);
    }

    const ultimateFallbackNames = this.getFallbackNamesOfJsonSchemaType(schema);
    names.push(...ultimateFallbackNames);

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
      if (extension.kind == OmniTypeKind.EXCLUSIVE_UNION || extension.kind == OmniTypeKind.UNION) {
        return true;
      }
    }

    return false;
  }

  private getVendorExtension<R>(obj: AnyJsonDefinition, key: string): R | undefined {

    if (typeof obj !== 'object') {
      return undefined;
    }

    if ('obj' in obj && 'root' in obj) {
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
    schemaType: Extract<AnyJSONSchema['type'], string> | 'any',
    primitiveType: OmniTypeKind,
    enumValues: JSONSchema9Type[],
    enumOwner?: AnyJSONSchema,
    description?: string,
  ) {

    let allowedValues: AllowedEnumTsTypes[];
    if (primitiveType == OmniTypeKind.STRING) {
      allowedValues = enumValues.map(it => `${String(it)}`);
    } else if (primitiveType == OmniTypeKind.DECIMAL
      || primitiveType == OmniTypeKind.FLOAT
      || primitiveType == OmniTypeKind.NUMBER) {
      allowedValues = enumValues.map(it => Number.parseFloat(`${String(it)}`));
    } else {
      allowedValues = enumValues.map(it => Number.parseInt(`${String(it)}`));
      primitiveType = OmniTypeKind.STRING;
    }

    const enumNames = JsonSchemaParser.getEnumNames(enumOwner, name);
    const enumDescriptions = JsonSchemaParser.getEnumDescriptions(enumOwner, allowedValues, name);

    // TODO: Try to convert the ENUM values into the specified primitive type.
    const omniEnum: OmniEnumType = {
      name: name ?? schemaType,
      kind: OmniTypeKind.ENUM,
      itemKind: primitiveType,
      enumConstants: allowedValues,
      description: description,
    };

    if (enumNames) {
      omniEnum.enumNames = enumNames;
    }

    if (enumDescriptions) {
      omniEnum.enumDescriptions = enumDescriptions;
    }

    return omniEnum;
  }

  private static getEnumDescriptions(enumOwner: JSONSchema9 | undefined, allowedValues: AllowedEnumTsTypes[], name: any) {

    let enumDescriptions: Record<string, string> | undefined = undefined;
    if (enumOwner && 'x-enum-descriptions' in enumOwner) {

      const varDescriptions = enumOwner['x-enum-descriptions'];
      if (Array.isArray(varDescriptions)) {

        enumDescriptions = {};
        for (let i = 0; i < varDescriptions.length; i++) {
          const key = String(allowedValues[i]);
          const value = String(varDescriptions[i]);
          logger.debug(`Setting ${key} description to: ${value}`);
          enumDescriptions[key] = value;
        }

      } else if (varDescriptions && typeof varDescriptions == 'object') {

        enumDescriptions = {};
        for (const [key, value] of Object.entries(varDescriptions)) {
          logger.debug(`Setting ${key} description to: ${value}`);
          enumDescriptions[key] = String(value);
        }

      } else {
        throw new Error(`x-enum-descriptions of ${Naming.unwrap(name)} must be an array or [string: string] record mapping`);
      }
    }

    return enumDescriptions;
  }

  private static getEnumNames(enumOwner: JSONSchema9 | undefined, name: any) {
    let enumNames: string[] | undefined = undefined;
    if (enumOwner && 'x-enum-varnames' in enumOwner) {

      const varNames = enumOwner['x-enum-varnames'];
      if (Array.isArray(varNames)) {

        enumNames = [];
        for (const varName of varNames) {
          enumNames.push(`${varName}`);
        }

      } else {
        throw new Error(`x-enum-varnames of ${Naming.unwrap(name)} must be an array`);
      }
    }

    // "NumberBoolean": {
    //       "enum": [
    //         0,
    //         1
    //       ],
    //       "x-enum-varnames": [
    //         "FALSE",
    //         "TRUE"
    //       ],
    //       "x-enum-descriptions": {
    //         "FALSE": "0 for false",
    //         "TRUE": "1 for true"
    //       },
    //       "type": "number"
    //     },

    return enumNames;
  }

  private getLiteralValueOfSchema(schema: JSONSchema9Type): OmniPrimitiveConstantValue | null | undefined {

    if (typeof schema == 'string') {
      return schema;
    } else if (typeof schema == 'number') {
      return schema;
    } else if (typeof schema == 'boolean') {
      return schema;
    }

    // TODO: How should we handle if an object or a whole schema structure is given here?
    //        That should be possible to be used as a literal constant as well, no?
    return undefined;
  }

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

    const compositionsOneOfOr: OmniType[] = [];
    const compositionsAllOfAnd: OmniType[] = [];
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
        const preferredName = this.getPreferredName(entry, resolved, {name: name, prefix: `IntersectionFor`});
        compositionsAllOfAnd.push(this.jsonSchemaToType(preferredName, resolved).type);
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
    if (schema.not && typeof schema.not !== 'boolean') {

      const resolved = this._refResolver.resolve(schema.not);
      const preferredName = this.getPreferredName(schema.not, resolved, name);
      compositionsNot = (this.jsonSchemaToType(preferredName, resolved)).type;
    }

    const composition = CompositionUtil.getCompositionOrExtensionType(
      compositionsAnyOfOr,
      compositionsAllOfAnd,
      compositionsOneOfOr,
      compositionsNot,
    );

    if (composition && OmniUtil.isComposition(composition) && !composition.name && schema.$id) {

      // This is a name that might not be the best suitable one. Might need to be more restrictive, or send more information along with the type.
      // For the name to be decided later by the target.
      if (!this.hasDirectContent(schema)) {
        composition.name = this.getPreferredName(schema, schema);
      }
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
            type: typeResult.type,
            qualifiers: [
              {
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
          type: subType,
          qualifiers: [
            {
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

      const commonDenominator = OmniUtil.getCommonDenominator(OMNI_GENERIC_FEATURES, ...staticArrayTypes.map(it => it.type))?.type;

      return {
        kind: OmniTypeKind.TUPLE,
        types: staticArrayTypes.map(it => it.type),
        description: schema.description,
        commonDenominator: commonDenominator,
      } satisfies OmniTupleType;

    } else {

      const resolved = this._refResolver.resolve(items);
      const fallbackItemName: TypeName = {
        name: name ?? '',
        suffix: 'Item',
      };
      const itemTypeName = this.getPreferredName(items, resolved, fallbackItemName);
      const itemType = this.jsonSchemaToType(itemTypeName, resolved);

      return {
        kind: OmniTypeKind.ARRAY,
        minLength: schema.minItems,
        maxLength: schema.maxItems,
        description: schema.description,
        of: itemType.type,
      };
    }
  }

  public transformErrorDataSchemaToOmniType(name: string, schema: AnyJSONSchema | undefined): OmniType | undefined {

    if (!schema) {
      return schema;
    }

    // The type is a JSONSchema7, though the type system seems unsure of that fact.
    let derefJsonSchema = this._refResolver.resolve(schema);
    if (!derefJsonSchema.$id) {
      derefJsonSchema.$id = name;
    }

    derefJsonSchema = JsonSchemaParser.preProcessJsonSchema(undefined, derefJsonSchema);

    const omniType = this.jsonSchemaToType(name, derefJsonSchema).type;
    logger.debug(`Using the from jsonschema converted omni type '${OmniUtil.describe(omniType)}'`);
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
          type: inheritor,
          qualifiers: [
            {
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
          name: key,
          type: propertyType,
          owner: objectType,
        });
      }

      return objectType;
    }
  }
}
