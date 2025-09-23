import {
  OMNI_GENERIC_FEATURES,
  OmniArrayKind,
  OmniArrayType,
  OmniArrayTypes,
  OmniComparisonOperator,
  OmniCompositionType,
  OmniDecoratingType,
  OmniEnumMember,
  OmniEnumType,
  OmniExample,
  OmniExclusiveUnionType,
  OmniItemKind,
  OmniModel,
  OmniModelParserResult,
  OmniObjectType,
  OmniPrimitiveKinds,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyName,
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
import {Case, CompositionUtil, isDefined, Naming, OmniUtil, SchemaFile, ToDefined, TypeNameUtil} from '@omnigen/core';
import {ApplyIdJsonSchemaTransformerFactory, SimplifyJsonSchemaTransformerFactory} from '../transform';
import {DefaultJsonSchema9Visitor, ExternalDocumentsFinder, JsonSchema9Visitor, RefResolver, ToSingle} from '../visit';
import Ajv2020, {ErrorObject} from 'ajv/dist/2020';
import {JsonSchemaMigrator} from '../migrate';
import {JSONSchema9, JSONSchema9Definition, JSONSchema9Type, JSONSchema9TypeName, PROP_ID} from '../definitions';
import {DocumentStore, JsonPathFetcher, ObjectVisitor} from '@omnigen/core-json';
import {JsonExpander} from '@omnigen-org/json-expander';
import {JsonSchemaNameParser, NameOptions} from './JsonSchemaNameParser.ts';

const logger = LoggerFactory.create(import.meta.url);

export type SchemaToTypeResult = { type: OmniType };

// TODO: Move into OpenApiJsonSchemaParser
export interface PostDiscriminatorMapping {
  type: OmniObjectType;
  schema: DiscriminatorAwareSchema;
}

export type AnyJSONSchema = JSONSchema9;
export type AnyJsonDefinition<S extends JSONSchema9> = JSONSchema9Definition<S>;
// TODO: Move into OpenApiJsonSchemaParser
export type DiscriminatorAwareSchema = boolean | (AnyJSONSchema & DiscriminatorAware);

const DISREGARDED_PROPERTIES: (keyof AnyJSONSchema | symbol)[] = ['allOf', 'oneOf', 'anyOf', 'oneOf', 'not', '$id', 'type', 'default', '$comment', PROP_ID] satisfies (keyof AnyJSONSchema | symbol)[];

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

  parse(): OmniModelParserResult<ParserOptions> {

    const docStore = new DocumentStore();
    let root = this._schemaFile.asObject<AnyJSONSchema>();
    root = JsonSchemaParser.preProcessSchema(this._schemaFile.getAbsolutePath(), DefaultJsonSchema9Visitor, root, 'schema', docStore);

    const model: OmniModel = {
      kind: OmniItemKind.MODEL,
      name: root.$schema || root.$id || '',
      version: '1.0',
      endpoints: [],
      servers: [],
      schemaVersion: root.$schema || '',
      schemaType: 'jsonschema',
      types: [],
    };

    const fileUri = this._schemaFile.getAbsolutePath() ?? '';

    const refResolver = (new ExternalDocumentsFinder(fileUri, root).create());

    const jsonSchemaParser = new JsonSchemaParser(refResolver, this._parserOptions);

    for (const [nameOptions, jsonPath, s] of this.getAllSchemas(root, jsonSchemaParser)) {

      try {
        const omniTypeRes = jsonSchemaParser.jsonSchemaToType(jsonPath, s, nameOptions);
        model.types.push(omniTypeRes.type);
      } catch (ex) {
        const schemaName = typeof s === 'boolean' ? '{}' : (s.$id ?? s.title ?? s.description ?? '???');
        throw new Error(`Error when handling schema '${schemaName}'`, {cause: ex});
      }
    }

    return {
      model: model,
      options: this._parserOptions,
    };
  }

  private* getAllSchemas<S extends JSONSchema9>(schema: JSONSchema9Definition<S>, parser: JsonSchemaParser<any>): Generator<[NameOptions | undefined, string[], AnyJsonDefinition<S>]> {

    if (typeof schema === 'boolean') {
      return;
    }

    if (schema.properties || schema.patternProperties || schema.type || schema.default !== undefined || (schema.type === undefined && schema.enum) || schema.format) {
      yield [undefined, [], schema];
    }

    if (schema.$defs) {
      for (const [key, value] of Object.entries(schema.$defs)) {
        yield [{key: key, fallbackSuffix: 'Definition'}, ['$defs', key], value];
      }
    }

    if (schema.definitions) {
      for (const [key, value] of Object.entries(schema.definitions)) {
        yield [{key: key, fallbackSuffix: 'Definition'}, ['definitions', key], value];
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
  private readonly _typeMap = new Map<unknown, OmniType>();
  private readonly _postDiscriminatorMapping: PostDiscriminatorMapping[] = [];
  public readonly _nameParser = new JsonSchemaNameParser();

  private readonly _refResolver: RefResolver;

  private readonly _options: TOpt;

  constructor(refResolver: RefResolver, options: TOpt) {
    this._refResolver = refResolver;
    this._options = options;
  }

  // protected get refResolver() {
  //   return this._refResolver;
  // }

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

  private readonly _mixedRefs = new Map<AnyJsonDefinition<JSONSchema9>, AnyJsonDefinition<JSONSchema9>>();

  public jsonSchemaToType(
    jsonPath: string[],
    unresolvedSchema: AnyJsonDefinition<JSONSchema9>,
    nameOptions?: NameOptions,
  ): SchemaToTypeResult {

    // TODO: Need to use PROP_ID sometimes -- like when we merge -- so that we do not create lots and lots of the same structures
    //     Though why would that happen? We should only be cloning stuff that is unique for that child anyway? Why are there duplicates created of the wrong things?
    // FIX ABOVE!

    // If there was no lossless resolve, then if there is one here
    if (this._options.mergeMixedReferences) {
      const existing = this._mixedRefs.get(unresolvedSchema);
      const aggregated = existing ?? this.aggregateMixed(jsonPath, unresolvedSchema);
      if (unresolvedSchema !== aggregated) {
        this._mixedRefs.set(unresolvedSchema, aggregated);
        unresolvedSchema = aggregated;
      }
    }

    let resolvedSchema: JSONSchema9Definition | undefined = this._refResolver.resolveLossless(unresolvedSchema, jsonPath);
    if (this._options.mergeMixedReferences) {
      const existing = this._mixedRefs.get(resolvedSchema);
      const aggregated = existing ?? this.aggregateMixed(jsonPath, resolvedSchema);
      if (resolvedSchema !== aggregated) {
        this._mixedRefs.set(resolvedSchema, aggregated);
        resolvedSchema = aggregated;
      }
    }

    // If contentDescriptor contains an anonymous schema,
    // then we want to be able to say that the ref to that schema is the ref of the contentDescriptor.
    // That way we will not get duplicates of the schema when called from different locations.
    // const id = this.getInternalId(resolvedSchema)
    //   || (resolvedSchema === true ? `__Any` : undefined)
    //   || (resolvedSchema === false ? `__Never` : undefined);

    const mainSchema = resolvedSchema ?? unresolvedSchema;
    // if (id) {
    const existing = this._typeMap.get(mainSchema);
    if (existing) {
      return {
        type: existing,
      };
    }
    // }

    if (resolvedSchema === unresolvedSchema) {
      resolvedSchema = undefined;
    }

    const name = this._nameParser.parse(unresolvedSchema, resolvedSchema, nameOptions);
    if (!name) {
      throw new Error(`Could not find any possible name for the schema`);
    }
    const schema = resolvedSchema ?? unresolvedSchema;
    const extendedBy = this.getExtendedBy(jsonPath, schema, name);
    const defaultType = this.getDefaultFromSchema(schema, name);

    const schemaTypes = new Set<JSONSchema9TypeName | undefined>;
    const schemaType = (typeof schema === 'object') ? schema.type : undefined;
    if (Array.isArray(schemaType)) {
      // The schema type is an array, so this type will ultimately become a union containing the different types.
      for (const item of schemaType) {
        schemaTypes.add(item);
      }
    } else {

      // It is a type or undefined, if `undefined` it is up to later code to decide what it is.
      schemaTypes.add(schemaType);
    }

    const hasConditionalSchemas = typeof schema === 'object' && Boolean(schema.if || schema.then || schema.else);
    let union: OmniCompositionType | undefined = undefined;
    if (schemaTypes.size > 1 || hasConditionalSchemas) {
      if (hasConditionalSchemas) {

        // If has conditional schemas, we need an `A & (B | C)` union.
        union = {
          kind: OmniTypeKind.INTERSECTION,
          types: [],
        };
      } else {

        // If no conditional schemas, we only need a `A | B | C` union.
        union = {
          kind: OmniTypeKind.UNION,
          types: [],
        };
      }

      // Need to register the union before it is completed, in case there are recursive references.
      // if (resolvedSchema) {
      this._typeMap.set(mainSchema, union);
      // }
    }

    const omniTypes: OmniType[] = [];
    for (const schemaType of schemaTypes) {

      let schemaTypeFallbackSuffix: TypeName | undefined;
      if (schemaType && schemaTypes.size > 1) {
        schemaTypeFallbackSuffix = nameOptions?.suffix ?? Case.pascal(schemaType);
      }

      // const schemaTypeNameOptions: NameOptions = {suffix: schemaTypeFallbackSuffix, suffixPrioritized: true};

      let omniType = this.jsonSchemaToNonObjectType(jsonPath, schema, name, extendedBy, defaultType, schemaType, {suffix: schemaTypeFallbackSuffix});
      if (!omniType) {

        const schemaObjectName = schemaTypeFallbackSuffix
          // Prioritize the usage of the name with the suffix, and only fallback on without the suffix.
          ? {name: name, suffix: schemaTypeFallbackSuffix}
          : name;

        // If it's nothing else, then it's an object.
        omniType = this.jsonSchemaToObjectType(jsonPath, schema, schemaObjectName, extendedBy);
      }

      // TODO: Need to force the type suffix to the name of the created types, and only remove/fix the name of the owning type is an empty type
      omniTypes.push(omniType);
    }

    if (union) {

      // TODO: This is incorrect and need to fully support predicated types. But for now this will have to do.
      // To support this we will need to create a composition type, even though the schema might say that it is an "object" or whatever.

      const conditionalTypes: OmniType[] = [];
      let conditionalUnion: OmniExclusiveUnionType | undefined = undefined;
      if (hasConditionalSchemas) {

        if (schema.then !== undefined) {
          conditionalTypes.push(this.jsonSchemaToType([...jsonPath, 'then'], schema.then, {ownerName: name, preferSuffix: 'Then'} satisfies NameOptions).type);
        }

        if (schema.else !== undefined) {
          conditionalTypes.push(this.jsonSchemaToType([...jsonPath, 'else'], schema.else, {ownerName: name, preferSuffix: 'Else'} satisfies NameOptions).type);
        }

        if (conditionalTypes.length > 0) {

          // Need to create a new exclusive union and add it to the existing union.
          // This might be simplified later if there are no appropriate distinguishers between the options.
          conditionalUnion = {
            kind: OmniTypeKind.EXCLUSIVE_UNION,
            inline: true,
            types: conditionalTypes,
          };
        }
      }

      const mainTypeIndex = omniTypes.findIndex(it => it.kind === OmniTypeKind.OBJECT);
      const mainType = (mainTypeIndex !== -1) ? omniTypes[mainTypeIndex] : omniTypes[0];

      if (OmniUtil.isEmptyType(mainType)) {
        if (conditionalUnion) {
          if (omniTypes.length === 1) {

            conditionalUnion.name = name;
            conditionalUnion.inline = mainType.inline ?? false;

            // `union` will be removed later, since it is a composition of only one type.
            union.types = [conditionalUnion];
            union.name = name;
          } else {
            omniTypes.splice(mainTypeIndex, 1);
            omniTypes.push(conditionalUnion);
            union.types = omniTypes;
            union.name = name;
          }
        } else {
          union.types = omniTypes;
          union.name = name; // TODO: This name is sometimes not correct -- at least for `openapi-v31.json` -- its "schema" is taken as way too high priority.
        }
      } else {
        if (conditionalUnion) {

          union.types.push(...omniTypes);
          union.types.push(conditionalUnion);

          const baseName = name ? {name: TypeNameUtil.shallowCopy(name), suffix: 'Base'} satisfies TypeName : union.name;
          let unionName = name;
          if (OmniUtil.isNameable(mainType)) {
            unionName = mainType.name ?? name;
            mainType.name = baseName;
          }

          union.name = unionName;
        } else {
          union.types = omniTypes;
          union.name = name;
        }
      }
    }

    const omniType = union ?? omniTypes[0];

    // if (id) {
    this._typeMap.set(mainSchema, omniType);
    // }

    let subTypeHints: OmniSubTypeHint[] | undefined = undefined;
    let postDiscriminatorNeeded = false;
    const discriminatorAware = this.getDiscriminatorAware(schema);
    if (discriminatorAware) {

      // This is an OpenApi JSON Schema.
      // Discriminators do not actually exist in JSONSchema, but it is way too useful to not make use of.
      // I think most people would think that this is supported for OpenRpc as well, as it should be.
      const subTypeHintsResult = this.getSubTypeHints(jsonPath, discriminatorAware);
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

  private aggregateMixed(jsonPath: string[], unresolvedSchema: AnyJsonDefinition<JSONSchema9>): AnyJsonDefinition<JSONSchema9> {

    let mixedResolved: any = this._refResolver.resolveMixed(unresolvedSchema, jsonPath);
    let aggregatedSchema: any = undefined;
    while (mixedResolved) {

      if (aggregatedSchema === undefined) {
        aggregatedSchema = JSON.parse(JSON.stringify(unresolvedSchema));
      }

      if (typeof aggregatedSchema === 'object' && typeof mixedResolved === 'object') {

        // Remove any previous $ref, and only replace with new one if one shows up.
        delete aggregatedSchema.$ref;

        const keys = [...new Set([...Object.keys(mixedResolved), ...Object.keys(aggregatedSchema)])];
        for (const k of keys) {

          // TODO: Skip merging $comments and such? Or Perhaps signify somehow that the comment came from a merged parent?

          // TODO: If go from "object" type to non-object, then we should likely remove any "oneOf" etc?

          const target = aggregatedSchema[k];
          const parent = mixedResolved[k];

          if (Array.isArray(target) || Array.isArray(parent)) {
            const targetArray = Array.isArray(target) ? target : (target === undefined ? [] : [target]);
            const parentArray = Array.isArray(parent) ? parent : (parent === undefined ? [] : [parent]);
            aggregatedSchema[k] = [...targetArray, ...JSON.parse(JSON.stringify(parentArray))];
          } else if (typeof target == 'object' && typeof parent === 'object') {
            aggregatedSchema[k] = {...JSON.parse(JSON.stringify(parent)), ...target};
          } else {
            aggregatedSchema[k] = target ?? JSON.parse(JSON.stringify(parent));
          }
        }
      }

      mixedResolved = this._refResolver.resolveMixed(mixedResolved, jsonPath);
    }

    // if (aggregatedSchema && aggregatedSchema !== unresolvedSchema) {
    //
    //   // TODO: EXTREMELY UGLY! We should stop relying on the symbol id and instead just work by reference and then deep copy objects when merging...
    //   // let uniqueCounter = 0;
    //   const visitor = new ObjectVisitor(args => {
    //     if (args.obj && typeof args.obj === 'object' && PROP_ID in args.obj) {
    //       if (args.obj[PROP_ID].includes('__merge__')) {
    //         // It has already been merged, let's not do it twice.
    //     existing    return true;
    //       }
    //       args.obj[PROP_ID] = `${args.obj[PROP_ID]}__merge__${jsonPath.join('_')}`;
    //     }
    //
    //     return true;
    //   });
    //
    //   visitor.visit(aggregatedSchema);
    // }

    return aggregatedSchema ?? unresolvedSchema;
  }

  public static preProcessSchema<
    S,
    V extends JsonSchema9Visitor,
  >(
    absolutePath: string | undefined,
    baseVisitor: V,
    root: S,
    entryKey: keyof V, // DocVisitorTransformer<S, any>,
    docStore: DocumentStore,
    applyIdVisitor?: V,
  ): S {

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

    // TODO: Need to fix these visitor transformers so the generics work.
    const simplifyVisitor = new SimplifyJsonSchemaTransformerFactory<JSONSchema9, V>(baseVisitor).create();
    applyIdVisitor = applyIdVisitor ?? new ApplyIdJsonSchemaTransformerFactory<JSONSchema9, V>(baseVisitor).create();

    const jsonsSchemaTransformers = [
      // new NormalizeDefsJsonSchemaTransformerFactory().create(),
      simplifyVisitor,
      applyIdVisitor,
    ];

    for (const transformer of jsonsSchemaTransformers) {
      const entry = transformer[entryKey];
      // TODO: Get rid of the cast here someday
      const transformed = (entry as any)(root, transformer);
      if (transformed && typeof transformed === 'object') {
        root = transformed;
      }
    }

    return root;
  }

  private static ajvErrorsToPrettyError(errors: ErrorObject[]): string | undefined {

    const messages: string[] = [];
    for (const error of errors) {
      messages.push(`@ ${error.schemaPath} => ${error.message}: ${JSON.stringify(error.params)}`);
    }

    if (messages.length === 0) {
      return undefined;
    }

    return `\n${messages.join('\n')}`;
  }

  private jsonSchemaToObjectType<S extends JSONSchema9>(
    jsonPath: string[],
    schema: AnyJsonDefinition<S>,
    name: TypeName | undefined,
    // internalId: string | undefined,
    extendedBy: OmniType | undefined,
  ): OmniType {

    if (typeof schema == 'boolean') {
      throw new Error(`Not allowed`);
    }

    if (!name) {
      name = this.getInternalId(schema);
      if (!name) {
        throw new Error(`Could not find a name for schema ${JSON.stringify(schema)}`);
      }
    }

    const type: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: name,
      description: schema.description,
      title: schema.title,
      properties: [],
      abstract: JsonSchemaParser.vendorExtensionToBool(schema, 'x-abstract', false),
    };

    if (!this._typeMap.has(schema)) {

      // Need to save it to the type map as soon as we can.
      // Otherwise we might end up with recursive loops in the schema.
      // This way we might be able to mitigate most of them.
      this._typeMap.set(schema, type);
    }

    const properties: OmniProperty[] = [];
    if (schema.properties) {
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        const propertyJsonPath = [...jsonPath, 'properties', key];
        const resolvedPropertySchema = this._refResolver.resolve(propertySchema, propertyJsonPath);
        properties.push(this.toOmniPropertyFromJsonSchema(propertyJsonPath, name, propertySchema, resolvedPropertySchema, schema));
      }
    }

    if (schema.required) {

      const requiredWithoutProperty = schema.required.filter(it => !properties.find(p => OmniUtil.getPropertyName(p.name) == it));

      for (const key of requiredWithoutProperty) {
        properties.push({
          kind: OmniItemKind.PROPERTY,
          name: key,
          required: true,
          type: {kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.ANY, debug: 'Added since property was required but not defined'},
        });
      }
    }

    if (schema.patternProperties) {

      for (const [propertyPattern, propertySchema] of Object.entries(schema.patternProperties)) {

        const patternPropertiesType = this.jsonSchemaToType([...jsonPath, 'patternProperties', propertyPattern], propertySchema, {
          preferSuffix: 'PatternProperties',
          ownerName: name,
        } satisfies NameOptions);

        properties.push({
          kind: OmniItemKind.PROPERTY,
          name: {
            isPattern: true,
            name: new RegExp(propertyPattern),
          },
          type: patternPropertiesType.type,
        });
      }
    }

    // additionalProperties is added last, as a fallthrough match. This ordering is important.
    const additionalProperties = schema.additionalProperties ?? this._options.defaultAdditionalProperties;
    if (additionalProperties) {

      const additionalPropertiesTypeRes = this.jsonSchemaToType([...jsonPath, 'additionalProperties'], additionalProperties, {
        ownerName: name,
        fallbackSuffix: 'AdditionalProperties',
      } satisfies NameOptions);
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

      if (OmniUtil.isNameable(newType) || (OmniUtil.isComposition(newType) && !newType.inline)) {

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
      OmniUtil.addDebugTo(type, `Adding extension ${OmniUtil.describe(extendedBy)}`);
    }

    return type;
  }

  /**
   * If the schema is "any", then for the case of AdditionalProperties we can restrict it into being a dictionary/object/map.
   */
  private normalizeAdditionalPropertiesType(type: OmniType): OmniType {

    if (type.kind === OmniTypeKind.UNKNOWN && type.unknownKind === UnknownKind.ANY) {
      // AdditionalProperties cannot be a primitive, it is always known to be an object of perhaps unknown contents.
      // So it is more accurate to say that it is a `DYNAMIC_OBJECT` rather than `ANY`
      return {...type, unknownKind: UnknownKind.DYNAMIC_OBJECT};
    } else {
      return type;
    }
  }

  private jsonSchemaToNonObjectType<S extends JSONSchema9, D extends AnyJsonDefinition<S>>(
    jsonPath: string[],
    schema: D,
    name: TypeName | undefined,
    extendedBy: OmniType | undefined,
    defaultType: OmniType | undefined,
    schemaType: JSONSchema9TypeName | undefined,
    nameOptions?: NameOptions,
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
          return this.createDecoratedType(schema, extendedBy, name, nameOptions);
        } else {
          return extendedBy;
        }
      }
    } else if (schemaType === 'array' || schema.items !== undefined) {
      return this.toArrayType(jsonPath, schema, name);
    }

    if (schemaType !== 'object') {

      const investigatedType = this.investigateSchemaType(schema, extendedBy, defaultType, schemaType);
      if (!investigatedType) {

        // If we could not figure out a type, then we will presume it is an object.
        return undefined;
      }

      const primitiveType = this.toPrimitive(jsonPath, schema, investigatedType.type, name, extendedBy, defaultType, nameOptions);
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
    jsonPath: string[],
    schema: AnyJSONSchema,
    schemaType: JsonSchemaTypeWithAny,
    name: TypeName | undefined,
    extendedBy: OmniType | undefined,
    defaultType: OmniType | undefined,
    nameOptions?: NameOptions,
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
      return this.toOmniEnum(jsonPath, name, schemaType, primitiveKind, schema.enum, schema, schema.description, isNullable, nameOptions);
    }

    const isConst = ('const' in schema);
    const isNativeNull = (primitiveKind == OmniTypeKind.NULL || primitiveKind == OmniTypeKind.VOID);
    const isLiteral = isConst || isNativeNull;

    let primitiveName: TypeName;
    if (name) {
      if (nameOptions?.suffix) {
        primitiveName = [{name: name, suffix: nameOptions.suffix}, name];

        // if (nameOptions.suffixPrioritized) {
        //
        // } else {
        //   primitiveName = [name, {name: name, suffix: nameOptions.suffix}];
        // }
      } else {
        primitiveName = name;
      }
    } else {
      // For now just set an empty string, which should create an autogenerated name.
      primitiveName = '';
      //throw new Error(`Could not find a name for primitive schema ${JSON.stringify(schema)}`);
    }

    const primitiveType: OmniPrimitiveType = {
      name: primitiveName,
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

    const usefulProperties = Object.keys(schema).filter(k => {
      if (DISREGARDED_PROPERTIES.includes(k as any)) {
        return false;
      }

      return ((schema as any)[k]) !== undefined;
    });

    return usefulProperties.length > 0;
  }

  private createDecoratedType(schema: AnyJSONSchema, inner: OmniType, name: TypeName | undefined, nameOptions?: NameOptions): OmniDecoratingType {

    if (!name) {
      throw new Error(`Could not find a name for decorated type's schema ${JSON.stringify(schema)}`);
    }

    return {
      kind: OmniTypeKind.DECORATING,
      of: inner,
      description: schema.description,
      title: schema.title,
      name: nameOptions?.suffix ? [name, {name: name, suffix: nameOptions?.suffix}] : name,
    };
  }

  private toOmniPropertyFromJsonSchema<S extends JSONSchema9>(
    jsonPath: string[],
    ownerName: TypeName,
    // propertyName: string,
    schema: AnyJsonDefinition<S>,
    resolvedSchema: AnyJsonDefinition<S>,
    schemaOwner: S,
  ): OmniProperty {

    const propertyName = jsonPath[jsonPath.length - 1];

    let propertyType: SchemaToTypeResult;
    try {
      propertyType = this.jsonSchemaToType(jsonPath, schema, {preferredOwnerName: ownerName, key: {name: propertyName, case: 'pascal'}} satisfies NameOptions);
    } catch (ex) {
      throw new Error(`Could not convert json schema of property '${propertyName}' from ${schemaOwner.$id} to omni type, because: ${ex}`, {cause: ex});
    }

    const property: OmniProperty = {
      kind: OmniItemKind.PROPERTY,
      name: JsonSchemaParser.getPreferredPropertyName(resolvedSchema, propertyName, this._options),
      type: propertyType.type,
      description: (typeof resolvedSchema === 'boolean') ? undefined : resolvedSchema.description,
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

  public static updateProperty<S extends JSONSchema9>(
    propertySchema: JSONSchema9Definition<S>,
    schemaOwner: JSONSchema9 | undefined,
    property: OmniProperty,
    propertyName: string,
  ) {

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

    if (schemaOwner) {
      schemas.push(schemaOwner);
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

    if (JsonSchemaParser.isRequiredProperty(schemaOwner, propertyName)) {
      property.required = true;
      property.debug = OmniUtil.addDebug(property.debug, `Setting required=true because schema said so`);
    }
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

  public static getVendorExtension<R>(obj: unknown, key: string | symbol): R | undefined {

    if (typeof obj !== 'object') {
      return undefined;
    }

    const records = obj as Record<string | symbol, unknown>;
    const value = (typeof key === 'symbol') ? records[key] : records[`x-${key}`];
    if (value == undefined) {
      return undefined;
    }

    return value as R;
  }

  public static getVendorExtensionBool(obj: unknown, key: string | symbol): boolean | undefined {

    const value = JsonSchemaParser.getVendorExtension<unknown>(obj, key);

    if (value === 'true' || value === true) {
      return true;
    }

    if (value === 'false' || value === false) {
      return false;
    }

    return undefined;
  }

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
    jsonPath: string[],
    name: TypeName | undefined,
    schemaType: JsonSchemaTypeWithAny,
    primitiveKind: OmniTypeKind,
    enumValues: JSONSchema9Type[],
    enumOwner?: AnyJSONSchema,
    description?: string,
    nullable?: boolean,
    nameOptions?: NameOptions,
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

    const enumItemNames = JsonSchemaParser.getEnumNames(enumOwner, enumMembers, name);
    const enumItemDescriptions = JsonSchemaParser.getEnumDescriptions(enumOwner, enumMembers, name);

    // TODO: Try to convert the ENUM values into the specified primitive type.
    let enumName = name ?? schemaType;
    if (nameOptions?.suffix && enumName) {
      enumName = [enumName, {name: enumName, suffix: nameOptions.suffix}];
    }

    if (!enumName) {
      throw new Error(`Could not find a name for the enum with keys: ${JSON.stringify(enumItemNames)}`);
    }

    const omniEnum: OmniEnumType = {
      name: enumName,
      kind: OmniTypeKind.ENUM,
      itemKind: primitiveKind,
      members: enumMembers,
      description: description,
    };

    if (nullable !== undefined) {
      omniEnum.nullable = nullable;
    }

    if (enumItemNames) {
      for (const [key, value] of Object.entries(enumItemNames)) {
        const found = enumMembers.find(it => String(it.value) === key);
        if (found) {
          found.name = value;
        }
      }
    }

    if (enumItemDescriptions) {
      for (const [key, value] of Object.entries(enumItemDescriptions)) {
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

    return enumNames;
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

  private hasRef(schema: JSONSchema9Definition): boolean {
    if (typeof schema === 'object') {
      return schema.$ref !== undefined || schema.$dynamicRef !== undefined;
    }

    return false;
  }

  private getExtendedBy<S extends JSONSchema9>(
    jsonPath: string[],
    schema: AnyJsonDefinition<S>,
    ownerName: TypeName | undefined,
  ): OmniType | undefined {

    if (typeof schema == 'boolean') {
      return undefined;
    }

    const compositionsAllOfAnd: OmniType[] = [];
    const compositionsOneOfOr: OmniType[] = [];
    const compositionsAnyOfOr: OmniType[] = [];
    let compositionsNot: OmniType | undefined;

    if (schema.oneOf) {
      for (let i = 0; i < schema.oneOf.length; i++) {
        compositionsOneOfOr.push(this.jsonSchemaToType([...jsonPath, 'oneOf', `${i}`], schema.oneOf[i], {ownerName: ownerName, fallbackSuffix: `${i}`} satisfies NameOptions).type);
      }
    }

    if (schema.allOf || schema.$ref) {

      const resolved = schema.$ref ? this._refResolver.resolve(schema, jsonPath) : undefined;
      if (resolved) {

        // There is a $ref in the schema at this point, so we will treat it as-if part of `allOf`
        const key = Naming.parse(schema.$ref);
        const refType = this.jsonSchemaToType(jsonPath, resolved, {ownerName: ownerName, key: key} satisfies NameOptions).type;
        if (refType.kind === OmniTypeKind.ARRAY) {

          // TODO: If this is the case, then this is likely a schema that has something like `{$ref: 'some-array', minLength: 10}`
          //        So it should instead be used to merge with its originating schema and make it a completely unique array type without any notion of "extending" or "supertype" or whatever.
          // TODO: Fix! Do it in an ugly way for now!
          // NOTE: This might not longer be an issue
          throw new Error(`Not implemented to have an array as the $ref`);

        } else {
          compositionsAllOfAnd.push(refType);
        }
      }

      if (schema.allOf) {
        for (let i = 0; i < schema.allOf.length; i++) {
          const omniType = this.jsonSchemaToType([...jsonPath, 'allOf', `${i}`], schema.allOf[i], {ownerName: ownerName, fallbackSuffix: `${i}`} satisfies NameOptions).type;
          if (!this.hasRef(schema.allOf[i])) {
            // If the child is not a ref type, but a type specified anonymously, then we specify it as inline.
            omniType.inline = omniType.inline ?? true;
          }

          compositionsAllOfAnd.push(omniType);
        }
      }
    }

    if (schema.anyOf) {
      for (let i = 0; i < schema.anyOf.length; i++) {
        compositionsAnyOfOr.push(this.jsonSchemaToType([...jsonPath, 'anyOf', `${i}`], schema.anyOf[i], {ownerName: ownerName, fallbackSuffix: `${i}`} satisfies NameOptions).type);
      }
    }

    // TODO: We need to support a schema that has `anyOf` and then different objects which contains a `required´
    // if (compositionsAnyOfOr.length > 0 && compositionsOneOfOr.length === 0 && compositionsAllOfAnd.length === 0) {
    //   const objectSchemas = compositionsAnyOfOr.filter(it => it.kind === OmniTypeKind.OBJECT && it.properties);
    //   if (objectSchemas.length > 1) {
    //     logger.warn(`Found schema with 'anyOf' containing multiple object types. This is not fully supported yet.`);
    //   }
    // }

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
      composition.name = this._nameParser.parse(schema);
      if (!composition.description && schema.description) {
        composition.description = schema.description;
      }
    }

    return composition;
  }

  /**
   * NOTE: This is not JsonSchema -- it is OpenApi and/or OpenRpc -- it does not belong here!
   */
  private getDiscriminatorAware<S extends JSONSchema9>(schema: AnyJsonDefinition<S> | DiscriminatorAwareSchema): (AnyJSONSchema & DiscriminatorAware) | undefined {

    if (typeof schema == 'boolean') {
      return undefined;
    }

    if ('discriminator' in schema) {
      return schema as typeof schema & DiscriminatorAware;
    }

    return undefined;
  }

  private getSubTypeHints(
    jsonPath: string[],
    schema: DiscriminatorAwareSchema,
  ): { hints: OmniSubTypeHint[] | undefined, postDiscriminatorNeeded: boolean } {

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
          const typeResult = this.jsonSchemaToType([...jsonPath, 'discriminator', 'mapping', key], fakeRef);

          const subTypeHint: OmniSubTypeHint = {
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
          };

          if (this._options.debug) {
            subTypeHint.debug = `Created from discriminator mapping '${key}' -> '${ref}'`;
            typeResult.type.debug = OmniUtil.addDebug(typeResult.type.debug, `Used by discriminator mapping '${key}' -> '${ref}'`);
          }

          subTypeHints.push(subTypeHint);

        } catch (ex) {
          throw new Error(`Could not find schema for mapping ${key}: '${ref}' --- ${String(ex)}`, {cause: ex});
        }
      }
    }

    let postDiscriminatorNeeded = false;
    // const subSchemas = [...(schema.anyOf || []), ...(schema.oneOf || [])];

    let subSchemaCount = 0;
    if (schema.anyOf && schema.anyOf.length > 0) {

      this.addSubTypeHints([...jsonPath, 'anyOf'], schema.anyOf, subTypeHints, discriminatorPropertyName);
      subSchemaCount += schema.anyOf.length;
    }

    if (schema.oneOf && schema.oneOf.length > 0) {

      // TODO: If it is "oneOf" and no other, then those should become SUB-TYPES! Make sure it is so!
      this.addSubTypeHints([...jsonPath, 'oneOf'], schema.oneOf, subTypeHints, discriminatorPropertyName);
      subSchemaCount += schema.oneOf.length;
    }

    if (subSchemaCount === 0) {

      // This schema does not contain any sub-schemas, so we cannot know which types that uses this schema.
      // HOWEVER, we can do that in post, after all other processing has been done.
      // NOTE: It might be beneficial to do this every time, even if there are sub-schemas provided.
      if (this._options.autoTypeHints) {
        postDiscriminatorNeeded = true;
      }
    }

    return {hints: (subTypeHints.length == 0) ? undefined : subTypeHints, postDiscriminatorNeeded};
  }

  private addSubTypeHints(
    jsonPath: string[],
    subSchemas: JSONSchema9Definition<JSONSchema9 & DiscriminatorAware>[],
    subTypeHints: OmniSubTypeHint[],
    discriminatorPropertyName: string,
  ) {

    for (let i = 0; i < subSchemas.length; i++) {
      const subSchema = subSchemas[i];

      const deref = this._refResolver.resolve(subSchema, [...jsonPath, `${i}`]);
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

      const subType = this.jsonSchemaToType([...jsonPath, `${i}`], subSchema).type;
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
  }

  private getId<S extends JSONSchema9>(schema: AnyJsonDefinition<S>): string | undefined {

    if (typeof schema == 'boolean') {
      return undefined;
    }

    return schema?.$id;
  }

  private getInternalId<S extends JSONSchema9>(schema: AnyJsonDefinition<S>): string | undefined {

    if (typeof schema == 'boolean') {
      return undefined;
    }

    if (schema !== undefined && PROP_ID in schema && schema[PROP_ID]) {
      return schema[PROP_ID] as string;
    }

    return this.getId(schema);
  }

  private toArrayType<S extends JSONSchema9, D extends JSONSchema9Definition<S>>(
    jsonPath: string[],
    schema: D,
    name: TypeName | undefined,
  ): OmniArrayTypes {

    if (typeof schema == 'boolean') {
      throw new Error(`The schema object should not be able to be a boolean`);
    }

    const items = schema.items;

    if (items === undefined || typeof items === 'boolean') {
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

      const staticArrayTypes = items.map((it, idx) => this.jsonSchemaToType([...jsonPath, 'items', `${idx}`], it));
      const commonDenominator = OmniUtil.getCommonDenominator(OMNI_GENERIC_FEATURES, staticArrayTypes.map(it => it.type))?.type;

      return {
        kind: OmniTypeKind.TUPLE,
        types: staticArrayTypes.map(it => it.type),
        description: schema.description,
        commonDenominator: commonDenominator,
      } satisfies OmniTupleType;

    } else {

      const arrayItemsJsonPath = [...jsonPath, 'items'];
      const resolved = this._refResolver.resolve(schema, arrayItemsJsonPath);
      const arrayName = this._nameParser.parse(schema, resolved, {onlyExplicit: true});
      // let arrayTypeName = name ?? arrayItemTypeName;
      // if (arrayTypeName && nameOptions?.suffix) {
      //   arrayTypeName = [arrayTypeName, {name: arrayTypeName, suffix: nameOptions.suffix}];
      // }

      const arrayType: OmniArrayType = {
        kind: OmniTypeKind.ARRAY,
        arrayKind: OmniArrayKind.LIST,
        name: arrayName,
        minLength: schema.minItems,
        maxLength: schema.maxItems,
        description: schema.description,
        of: {
          // Temporary type while the item's type is being built
          kind: OmniTypeKind.UNKNOWN,
          unknownKind: UnknownKind.ANY,
        },
      };

      // if (internalId) {

      // Need to persist the array type early in case it is self-referential.
      this._typeMap.set(schema, arrayType);
      // }

      // Then place the real type into the array.
      const ownerName: TypeName = arrayName && name ? [arrayName, name] : (name ? [name] : []);
      arrayType.of = this.jsonSchemaToType(arrayItemsJsonPath, items, {ownerName: ownerName, fallbackSuffix: 'Item'} satisfies NameOptions).type;

      return arrayType;
    }
  }

  public transformErrorDataSchemaToOmniType(
    jsonPath: string[],
    name: string,
    schema: AnyJSONSchema | undefined,
    docStore: DocumentStore,
  ): OmniType | undefined {

    if (!schema) {
      return schema;
    }

    let derefJsonSchema = this._refResolver.resolve(schema, jsonPath);
    derefJsonSchema = JsonSchemaParser.preProcessSchema(undefined, DefaultJsonSchema9Visitor, derefJsonSchema, 'schema', docStore);

    const omniType = this.jsonSchemaToType(jsonPath, derefJsonSchema, {
      alternatives: name,
    } satisfies NameOptions).type;
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

  private getDefaultFromSchema<S extends JSONSchema9>(schema: AnyJsonDefinition<S>, path: TypeName | undefined): OmniType | undefined {

    if (typeof schema !== 'boolean' && schema.default !== undefined) {
      return this.getDefault(schema.default, path);
    }

    return undefined;
  }

  private getDefault(def: AnyJSONSchema['default'], path: TypeName | undefined): OmniType | undefined {

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

      const objectType: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: {name: path ?? '?', suffix: 'default'}, properties: []};
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
