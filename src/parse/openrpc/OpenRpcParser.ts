import {AbstractParser} from '@parse/AbstractParser';

import {
  AllowedEnumGenericPrimitiveTypes,
  AllowedEnumTsTypes,
  ComparisonOperator,
  CompositionKind,
  GenericAccessLevel,
  GenericArrayPropertiesByPositionType,
  GenericArrayType,
  GenericArrayTypesByPositionType,
  GenericClassType,
  GenericCompositionType,
  GenericContact,
  GenericContinuation,
  GenericContinuationMapping,
  GenericContinuationSourceParameter,
  GenericContinuationTargetParameter,
  GenericEndpoint,
  GenericExamplePairing,
  GenericExampleParam,
  GenericExampleResult,
  GenericExternalDocumentation,
  GenericLicense,
  GenericModel,
  GenericOutput,
  GenericPayloadPathQualifier,
  GenericPrimitiveKind,
  GenericPrimitiveType,
  GenericProperty,
  GenericPropertyOwner,
  GenericServer,
  GenericType,
  GenericTypeKind,
  SchemaFile,
  TypeName,
} from '@parse';
import {parseOpenRPCDocument} from '@open-rpc/schema-utils-js';
import {
  ContactObject,
  ContentDescriptorOrReference,
  ErrorOrReference,
  ExampleOrReference,
  ExamplePairingOrReference,
  ExternalDocumentationObject,
  Items,
  JSONSchema,
  JSONSchemaObject,
  LicenseObject,
  LinkObject,
  MethodObject,
  MethodObjectErrors,
  MethodObjectResult,
  MethodOrReference,
  OpenrpcDocument,
  ReferenceObject,
  ServerObject,
} from '@open-rpc/meta-schema';
import {JSONSchema7} from 'json-schema';
import {default as DefaultReferenceResolver} from '@json-schema-tools/reference-resolver';
import {camelCase, pascalCase} from 'change-case';
import {JavaUtil} from '@java';
import * as stringSimilarity from 'string-similarity';
import {Rating} from 'string-similarity';
import {LoggerFactory} from '@util';
import {DEFAULT_PARSER_OPTIONS, IParserOptions} from '@parse/IParserOptions';
import {CompositionUtil} from '@parse/CompositionUtil';
import {Naming} from '@parse/Naming';

export const logger = LoggerFactory.create(__filename);

type SchemaToTypeResult = { type: GenericType; canInline: boolean };

export class OpenRpcParser extends AbstractParser {

  async parse(schemaFile: SchemaFile): Promise<GenericModel> {
    const schemaObject = await schemaFile.asObject();
    const document = await parseOpenRPCDocument(schemaObject as OpenrpcDocument, {
      dereference: false,
    });
    const parserImpl = new OpenRpcParserImpl(document);
    return parserImpl.docToGenericModel();
  }

  canHandle(schemaFile: SchemaFile): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class OpenRpcParserImpl {

  private static readonly PATTERN_PLACEHOLDER = new RegExp(/^[$]{([^}]+)}$/);
  private static readonly PATTERN_PLACEHOLDER_RELAXED = new RegExp(/(?:[$]{([^}]+)}$|^{{([^}]+?)}}$|^[$](.+?)$)/);

  private readonly _doc: OpenrpcDocument;
  private readonly _options: IParserOptions;

  private readonly _derefPromiseMap = new Map<string, Promise<unknown>>();
  private readonly _typePromiseMap = new Map<string, Promise<SchemaToTypeResult>>();
  private readonly _contentDescriptorPromiseMap = new Map<string, Promise<GenericProperty>>();

  constructor(doc: OpenrpcDocument, options = DEFAULT_PARSER_OPTIONS) {
    this._doc = doc;
    this._options = options;
  }

  async docToGenericModel(): Promise<GenericModel> {
    const endpoints = await Promise.all(this._doc.methods.map((method) => this.methodToGenericEndpoint(method)));
    const contact = this._doc.info.contact ? this.contactToGenericContact(this._doc.info.contact) : undefined;
    const license = this._doc.info.license ? this.licenseToGenericLicense(this._doc.info.license) : undefined;
    const servers = (this._doc.servers || []).map((server) => this.serverToGenericServer(server));
    const docs = this._doc.externalDocs ? [this.externalDocToGenericExternalDoc(this._doc.externalDocs)] : [];
    const continuations = await this.linksToGenericContinuations(endpoints);

    const model: GenericModel = {
      schemaType: 'openrpc',
      schemaVersion: this._doc.openrpc,
      name: this._doc.info.title,
      description: this._doc.info.description,
      version: this._doc.info.version,
      contact: contact,
      license: license,
      termsOfService: this._doc.info.termsOfService,
      servers: servers,
      externalDocumentations: docs,
      endpoints: endpoints,
      continuations: continuations,
      types: (await Promise.all([...this._typePromiseMap.values()])).map(it => it.type),
    };

    return model;
  }

  private licenseToGenericLicense(license: LicenseObject): GenericLicense {
    return <GenericLicense>{
      name: license.name,
      url: license.url,
    };
  }

  private contactToGenericContact(contact: ContactObject): GenericContact {
    return <GenericContact>{
      name: contact.name,
      url: contact.url,
      email: contact.email,
    };
  }

  private async methodToGenericEndpoint(method: MethodOrReference): Promise<GenericEndpoint> {

    const dereferenced = await this.dereference(method);
    method = dereferenced.object;

    // TODO:
    //   method.tags
    //   method.servers

    const responses: GenericOutput[] = [];

    // One regular response
    const resultResponse = await this.resultToGenericOutputAndResultParamType(method, method.result);
    resultResponse.type.nameClassifier = resultResponse.type.nameClassifier || `${pascalCase(method.name)}Response`;
    responses.push(resultResponse.output);

    // And then one response for each potential error
    let errors: MethodObjectErrors = method.errors || [];
    if (errors.length == 0) {
      // If there were no known errors specified, then we will add a generic fallback.
      errors = [{
        code: -1234567890,
        message: 'Unknown Error',
      }];
    }

    for (const error of errors) {
      responses.push(await this.errorToGenericOutput(pascalCase(method.name), error));
    }

    const input = await this.methodToGenericInputType(method);

    const examples = await Promise.all(
      (method.examples || []).map((it) => this.examplePairingToGenericExample(resultResponse.type, input.properties || [], it))
    );

    // TODO: Remake so that the request body is another type!
    //  The parameters build into an object
    //  -- for other specifications, the parameters end up in the URL and headers maybe! That's a later problem!
    // TODO: Also need to handle the "required" in a good way. JSR-303 annotations? If-cases? Both?

    return <GenericEndpoint>{
      name: method.name,
      description: method.description,
      summary: method.summary,
      async: false,
      path: '',
      request: {
        contentType: 'application/json',
        type: input.type
      },
      requestQualifiers: [
        {
          path: ['method'],
          operator: ComparisonOperator.EQUALS,
          value: method.name,
        },
      ],
      responses: responses,
      deprecated: method.deprecated,
      examples: examples,
      externalDocumentations: method.externalDocs ? [this.externalDocToGenericExternalDoc(method.externalDocs)] : [],
    };
  }

  private async jsonSchemaToType(names: TypeName[], schema: JSONSchema, ref?: string)
    : Promise<SchemaToTypeResult> {
    if (typeof schema == 'boolean') {
      return {
        type: {
          name: 'boolean',
          kind: GenericTypeKind.PRIMITIVE,
          primitiveKind: GenericPrimitiveKind.BOOL,
        },
        canInline: false
      };
    }

    const dereferenced = await this.dereference(schema);
    const actualRef = ref || dereferenced.ref;

    if (actualRef) {

      // The ref is the much better unique name of the type.
      schema = dereferenced.object;
      names = [actualRef];

      const existing = this._typePromiseMap.get(actualRef);
      if (existing) {
        return await existing;
      }
    }

    const promise = this.jsonSchemaToTypeUncached(schema, names, actualRef);
    if (actualRef) {
      this._typePromiseMap.set(actualRef, promise);
    }

    return await promise;
  }

  private async jsonSchemaToTypeUncached(
    schema: JSONSchemaObject,
    names: TypeName[],
    ref: string | undefined
  ): Promise<SchemaToTypeResult> {

    const nonClassType = await this.jsonSchemaToNonClassType(schema, names);
    if (nonClassType) {
      return {
        type: nonClassType,
        canInline: false,
      };
    }

    const type: GenericClassType = {
      name: () => names.map(it => Naming.unwrap(it)).join('_'),
      nameClassifier: schema.title ? pascalCase(schema.title) : String(schema.type),
      kind: GenericTypeKind.OBJECT,
      description: schema.description,
      title: schema.title,

      // TODO: This is incorrect. 'additionalProperties' is more advanced than true/false
      additionalProperties: (schema.additionalProperties == undefined
          ? undefined
          : typeof schema.additionalProperties == 'boolean'
            ? schema.additionalProperties
            : true
      )
    };

    const genericProperties: GenericProperty[] = [];
    const requiredProperties: GenericProperty[] = [];
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        const propertySchema = schema.properties[key] as JSONSchema7;
        const genericProperty = await this.jsonSchema7ToGenericProperty(type, key, propertySchema);

        genericProperties.push(genericProperty);
        if (schema.required?.indexOf(key) !== -1) {
          requiredProperties.push(genericProperty);
        }
      }
    }

    type.properties = genericProperties.length ? genericProperties : undefined;
    type.requiredProperties = requiredProperties;

    if (schema.not) {
      // ???
    }

    if (schema.multipleOf) {
      // TODO: Make this general, so that all other places call it.
    }

    return {
      type: await this.extendOrEnhanceClassType(schema, type, names),

      // If this type is inline in the JSON Schema, without being referenced as a ref:
      // Then we might possibly be able to merge this type with the caller, if it wants to.
      canInline: (ref == undefined)
    };
  }

  private async jsonSchemaToNonClassType(schema: JSONSchemaObject, names: TypeName[]): Promise<GenericType | undefined> {

    if (typeof schema.type === 'string') {
      if (schema.type === 'array') {
        return await this.getArrayItemType(schema, schema.items, names)
      } else if (schema.type !== 'object') {

        // TODO: This is not lossless if the primitive has comments/summary/etc
        const t = this.typeToGenericKnownType(schema.type, schema.format, schema.enum);
        const schemaType = schema.type;
        if (t.length == 1) {
          return {
            name: names.length ? () => names.map(it => Naming.unwrap(it)).join('_') : schemaType,
            kind: t[0],
            description: schema.description,
          };
        } else if (t.length == 3) {
          return {
            name: names.length ? () => names.map(it => Naming.unwrap(it)).join('_') : schemaType,
            kind: t[0],
            primitiveKind: t[1],
            enumConstants: t[2],
            description: schema.description,
          };
        } else {
          return {
            name: names.length ? () => names.map(it => Naming.unwrap(it)).join('_') : schemaType,
            kind: t[0],
            primitiveKind: t[1],
            description: schema.description,
          };
        }
      }
    }

    return undefined;
  }

  public async extendOrEnhanceClassType(schema: JSONSchemaObject, type: GenericClassType, names: TypeName[]): Promise<GenericType> {

    // TODO: Work needs to be done here which merges types if possible.
    //        If the type has no real content of its own, and only inherits,
    //        Then it might be that this "type" can cease to exist and instead be replaced by its children

    // TODO: Make it optional to "simplify" types that inherit from a primitive -- instead make it use @JsonValue (and maybe @JsonCreator)

    const compositionsOneOfOr: GenericType[] = [];
    const compositionsAllOfAnd: GenericType[] = [];
    const compositionsAnyOfOr: GenericType[] = [];
    let compositionsNot: GenericType | undefined;

    if (schema.oneOf) {

      if (schema.oneOf.length == 1) {
        // Weird way of writing the schema, but if it's just 1 then it's same as "allOf"
        schema.allOf = (schema.allOf || []).concat(schema.oneOf);
        schema.oneOf = undefined;
      } else {
        compositionsOneOfOr.push(
          ...(await Promise.all(schema.oneOf.map(it => this.jsonSchemaToType(names, it)))).map(it => it.type)
        );
      }
    }

    // todo: fix back the commented out mergeType -- probable problem

    if (schema.allOf?.length) {

      for (const allOf of schema.allOf) {
        const subType = await this.jsonSchemaToType(names, allOf);
        if (subType.canInline) {
          // This schema can actually just be consumed by the parent type.
          // This happens if the sub-schema is anonymous and never used by anyone else.
          this.mergeType(subType.type, type);
        } else {
          compositionsAllOfAnd.push(subType.type);
        }
      }
    }

    if (schema.anyOf?.length) {

      // const types: GenericType[] = [];
      for (const anyOf of schema.anyOf) {
        const subType = await this.jsonSchemaToType(names, anyOf);
        compositionsAnyOfOr.push(subType.type);
      }
    }

    if (schema.not && typeof schema.not !== 'boolean') {
      compositionsNot = (await this.jsonSchemaToType(names, schema.not)).type;
    }

    const extendedBy = CompositionUtil.getCompositionOrExtensionType(
      compositionsAnyOfOr,
      compositionsAllOfAnd,
      compositionsOneOfOr,
      compositionsNot
    );

    // TODO: Remove this? It should be up to the final language to decide how to handle it, right?
    if (type.additionalProperties == undefined && type.properties == undefined) {

      // If there object is "empty" but we inherit from something, then just use the inherited type instead.
      // NOTE: This might be "inaccurate" and should maybe be more selective (like ONLY replacing COMPOSITIONS)
      if (extendedBy) {

        return {
          ...extendedBy,
          ...{
            // The name should be kept the same, since it is likely much more specific.
            name: type.name,

            // TODO: Should the two types' descriptions be merged if both exist?
            description: extendedBy.description || type.description,
            summary: extendedBy.summary || type.summary,
            title: extendedBy.title || type.title,
          }
        };
      }
    }

    type.extendedBy = extendedBy;
    return type;
  }

  private async getArrayItemType(schema: JSONSchemaObject, items: Items | undefined, names: TypeName[]): Promise<GenericArrayType | GenericArrayPropertiesByPositionType | GenericArrayTypesByPositionType> {

    if (!items) {
      // No items, so the schema for the array items is undefined.
      const arrayTypeName: TypeName = (names.length > 0)
        ? () => names.map(it => Naming.unwrap(it)).join('_')
        : `ArrayOfUnknowns`;

      return {
        name: arrayTypeName,
        kind: GenericTypeKind.ARRAY,
        minLength: schema.minItems,
        maxLength: schema.maxItems,
        description: schema.description,
        of: {
          name: () => `UnknownItemOf${Naming.unwrap(arrayTypeName)}`,
          kind: GenericTypeKind.UNKNOWN,
          additionalProperties: true,
        },
      }

    } else if (typeof items == 'boolean') {
      throw new Error(`Do not know how to handle a boolean items '${names.join('.')}' in '${this._doc.info.title}'`);
    } else if (Array.isArray(items)) {

      // TODO: We should be introducing interfaces that describe the common denominators between the different items?
      // TODO: This needs some seriously good implementation on the code-generator side of things.
      // TODO: What do we do here if the type can be inlined? Just ignore I guess?
      const staticArrayTypes = (await Promise.all(
        items.map((it) => this.jsonSchemaToType([], it))
      ));

      // const staticArrayTypeNames = ;
      const commonDenominator = JavaUtil.getCommonDenominator(...staticArrayTypes.map(it => it.type));

      return <GenericArrayTypesByPositionType>{
        name: names.length > 0
          ? () => names.map(it => Naming.unwrap(it)).join('_')
          : `ArrayOf${staticArrayTypes.map(it => Naming.safer(it.type)).join('And')}`,
        kind: GenericTypeKind.ARRAY_TYPES_BY_POSITION,
        types: staticArrayTypes.map(it => it.type),
        description: schema.description,
        commonDenominator: commonDenominator,
      };

    } else {
      // items is a single JSONSchemaObject
      let itemTypeNames: TypeName[];
      if (items.title) {
        itemTypeNames = [pascalCase(items.title)];
      } else {
        itemTypeNames = names.map(it => () => `${Naming.unwrap(it)}Item`);
      }

      const itemType = (await this.jsonSchemaToType(itemTypeNames, items)).type;

      const arrayTypeName: TypeName = (names.length > 0)
        ? () => `${names.map(it => Naming.unwrap(it)).join('_')}`
        : () => `ArrayOf${Naming.safer(itemType)}`;

      return {
        name: arrayTypeName,
        nameClassifier: 'Array',
        kind: GenericTypeKind.ARRAY,
        minLength: schema.minItems,
        maxLength: schema.maxItems,
        description: schema.description,
        of: itemType,
      };
    }
  }

  private mergeType(from: GenericType, to: GenericType, lossless = true): GenericType {

    if (from.kind == GenericTypeKind.OBJECT && to.kind == GenericTypeKind.OBJECT) {

      for (const fromProperty of (from.properties || [])) {
        const toProperty = to.properties?.find(p => p.name == fromProperty.name);
        if (!toProperty) {
          // This is a new property, and can just be added to the 'to'.
          this.addPropertyToClassType(fromProperty, to);
        } else {
          // This property already exists, so we should try and find common type.
          if (lossless) {
            throw new Error(`Property ${toProperty.name} already exists, and merging should be lossless`);
          } else {
            this.mergeTwoPropertiesAndAddToClassType(fromProperty, toProperty, to);
          }
        }
      }
    }

    return to;
  }

  private mergeTwoPropertiesAndAddToClassType(a: GenericProperty, b: GenericProperty, to: GenericClassType): void {
    const common = JavaUtil.getCommonDenominatorBetween(a.type, b.type);
    if (common) {
      if (to.properties) {
        const idx = to.properties.indexOf(b);
        if (idx !== -1) {
          to.properties.splice(idx, 1);
        }
      }
      this.addPropertyToClassType(a, to, common);
    } else {
      const vsString = `${Naming.safer(a.type)} vs ${Naming.safer(b.type)}`;
      const errMessage = `No common type for merging properties ${a.name}. ${vsString}`;
      throw new Error(errMessage);
    }
  }

  private addPropertyToClassType(property: GenericProperty, toType: GenericClassType, as?: GenericType): void {

    if (!toType.properties) {
      toType.properties = [];
    }

    toType.properties.push({
      ...property,
      ...{
        owner: toType,
        type: as || property.type
      }
    });
  }

  private async jsonSchema7ToGenericProperty(owner: GenericPropertyOwner, propertyName: string, schema: JSONSchema7)
    : Promise<GenericProperty> {
    // This is ugly, but they should hopefully be the same.
    const openRpcJsonSchema = schema as JSONSchema;

    // The type name will be replaced if the schema is a $ref to another type.
    const propertyTypeName = (schema.title ? camelCase(schema.title) : undefined) || propertyName;
    const propertyType = (await this.jsonSchemaToType([propertyTypeName], openRpcJsonSchema)).type;

    return <GenericProperty>{
      name: propertyName,
      type: propertyType,
      owner: owner
    };
  }

  private async resultToGenericOutputAndResultParamType(method: MethodObject, result: MethodObjectResult): Promise<{ output: GenericOutput; type: GenericType }> {

    const dereferenced = await this.dereference(result);
    result = dereferenced.object;

    const typeNamePrefix = pascalCase(method.name);

    // TODO: Should this always be unique, or should we ever use a common inherited method type?
    const resultParameterType = (await this.jsonSchemaToType([dereferenced.ref || result.name], result.schema)).type;
    const resultType: GenericType = {
      name: `${typeNamePrefix}Response`,
      kind: GenericTypeKind.OBJECT,
      additionalProperties: false,
      description: method.description,
      summary: method.summary,
    };

    resultType.properties = [
      {
        name: 'result',
        type: resultParameterType,
        owner: resultType
      },
      {
        name: 'error',
        type: {
          name: `${typeNamePrefix}ResultError`,
          kind: GenericTypeKind.NULL,
        },
        owner: resultType
      },
      {
        name: 'id',
        type: {
          name: `${typeNamePrefix}ResultId`,
          kind: GenericTypeKind.PRIMITIVE,
          primitiveKind: GenericPrimitiveKind.STRING,
        },
        owner: resultType
      },
    ];

    // types.push(resultType);

    return {
      output: <GenericOutput>{
        name: result.name,
        description: result.description,
        summary: result.summary,
        deprecated: result.deprecated || false,
        required: result.required,
        type: resultType,
        contentType: 'application/json',
        qualifiers: [
          {
            path: ['result'],
            operator: ComparisonOperator.DEFINED,
          },
        ],
      },
      type: resultParameterType
    };
  }

  private async errorToGenericOutput(parentName: string, error: ErrorOrReference): Promise<GenericOutput> {

    const dereferenced = await this.dereference(error);
    error = dereferenced.object;

    const isUnknownCode = (error.code === -1234567890);
    const typeName = `${parentName}Error${isUnknownCode ? 'Unknown' : error.code}`;

    const errorPropertyType: GenericClassType = {
      name: `${typeName}Error`,
      kind: GenericTypeKind.OBJECT,
      additionalProperties: false,
    };

    errorPropertyType.properties = [
      // For Trustly we also have something called "Name", which is always "name": "JSONRPCError",
      {
        name: 'code',
        type: {
          name: `${typeName}CodeInteger`,
          valueConstant: isUnknownCode ? undefined : error.code,
          kind: GenericTypeKind.PRIMITIVE,
          primitiveKind: GenericPrimitiveKind.INTEGER,
        },
        owner: errorPropertyType,
      },
      {
        name: 'message',
        type: {
          name: `${typeName}MessageString`,
          valueConstant: error.message,
          kind: GenericTypeKind.PRIMITIVE,
          primitiveKind: GenericPrimitiveKind.STRING,
        },
        owner: errorPropertyType,
      },
      {
        // For Trustly this is called "error" and not "data",
        // then inside "error" we have "uuid", "method", "data": {"code", "message"}
        // TODO: We need a way to specify the error structure -- which OpenRPC currently *cannot*
        name: 'data',
        type: {
          name: `${typeName}UnknownData`,
          valueConstant: error.data,
          kind: GenericTypeKind.UNKNOWN,
          additionalProperties: true,
        },
        owner: errorPropertyType,
      },
    ];

    // types.push(errorPropertyType);

    const errorType: GenericClassType = {
      name: typeName,
      accessLevel: GenericAccessLevel.PUBLIC,
      kind: GenericTypeKind.OBJECT,
      additionalProperties: false,
    };

    const errorProperty: GenericProperty = {
      name: 'error',
      type: errorPropertyType,
      owner: errorType,
    };

    errorType.properties = [
      {
        name: 'result',
        type: {
          name: () => `${Naming.unwrap(errorPropertyType.name)}AlwaysNullResultBody`,
          kind: GenericTypeKind.NULL,
        },
        owner: errorType,
      },
      errorProperty,
      {
        name: 'id',
        type: {
          name: `${typeName}IdString`,
          kind: GenericTypeKind.PRIMITIVE,
          primitiveKind: GenericPrimitiveKind.STRING,
        },
        owner: errorType,
      },
    ];
    errorType.requiredProperties = [errorProperty];

    // types.push(errorType);

    const qualifiers: GenericPayloadPathQualifier[] = [{
      path: ['error'],
      operator: ComparisonOperator.DEFINED,
    }];

    if (!isUnknownCode) {
      qualifiers.push({
        path: ['error', 'code'],
        operator: ComparisonOperator.EQUALS,
        value: error.code,
      });
    }

    return <GenericOutput>{
      name: `error-${isUnknownCode ? 'unknown' : error.code}`,
      deprecated: false,
      required: false,
      type: errorType,
      contentType: 'application/json',
      qualifiers: qualifiers,
    };
  }

  private async examplePairingToGenericExample(valueType: GenericType, inputProperties: GenericProperty[], example: ExamplePairingOrReference): Promise<GenericExamplePairing> {

    const dereferenced = await this.dereference(example);
    example = dereferenced.object;

    const params = await Promise.all(
      example.params.map((param, idx) => this.exampleParamToGenericExampleParam(inputProperties, param, idx))
    );

    return <GenericExamplePairing>{
      name: example.name,
      description: example.description,
      summary: example['summary'] as string | undefined, // 'summary' does not exist in the OpenRPC object, but does in spec.
      params: params,
      result: await this.exampleResultToGenericExampleResult(valueType, example.result),
    };
  }

  private async exampleParamToGenericExampleParam(inputProperties: GenericProperty[], param: ExampleOrReference, paramIndex: number): Promise<GenericExampleParam> {

    const paramDeref = await this.dereference(param);

    // If the name of the example param is the same as the property name, it will match here.
    let property = inputProperties.find(it => it.name == paramDeref.object.name);
    if (!property) {

      // But most of the time, the example param is actually just in the same index as the request params.
      // NOTE: This is actually *how the standard works* -- but we try to be nice.
      property = inputProperties[paramIndex];
    }

    let valueType: GenericType;
    if (property) {
      valueType = property.type;
    } else {
      valueType = <GenericClassType>{kind: GenericTypeKind.UNKNOWN};
    }

    return <GenericExampleParam>{
      name: paramDeref.object.name,
      property: property,
      description: paramDeref.object.description,
      summary: paramDeref.object.summary,
      type: valueType,
      value: paramDeref.object.value,
    };
  }

  private async exampleResultToGenericExampleResult(valueType: GenericType, example: ExampleOrReference): Promise<GenericExampleResult> {

    const dereference = await this.dereference(example);
    example = dereference.object;

    if (example['externalValue']) {

      // This is part of the specification, but not part of the OpenRPC interface.
    }

    return <GenericExampleResult>{
      name: example.name,
      description: example.description,
      summary: example.summary,
      value: example.value,
      type: valueType
    };
  }

  private externalDocToGenericExternalDoc(documentation: ExternalDocumentationObject): GenericExternalDocumentation {
    return <GenericExternalDocumentation>{
      url: documentation.url,
      description: documentation.description,
    };
  }

  private serverToGenericServer(server: ServerObject): GenericServer {
    return <GenericServer>{
      name: server.name,
      description: server.description,
      summary: server.summary,
      url: server.url,
      variables: new Map<string, unknown>(Object.entries((server.variables || {}))),
    };
  }

  private async contentDescriptorToGenericProperty(owner: GenericPropertyOwner, descriptor: ContentDescriptorOrReference)
    : Promise<GenericProperty> {

    const ref = descriptor.$ref as string;
    if (ref) {
      const promise = this._contentDescriptorPromiseMap.get(ref);
      if (promise) {
        return await promise;
      }
    }

    const promise = this.dereference(descriptor)
      .then(async deref => {
        const preferredName = deref.ref || deref.object.name;
        const propertyType = (await this.jsonSchemaToType([preferredName], deref.object.schema)).type;

        return <GenericProperty>{
          name: deref.object.name,
          description: deref.object.description,
          summary: deref.object.summary,
          deprecated: deref.object.deprecated || false,
          required: deref.object.required || false,
          type: propertyType,
          owner: owner,
        };
      });

    if (ref) {

      // Cache the promise, so we will ask for the same one every time.
      this._contentDescriptorPromiseMap.set(ref, promise);
    }

    return await promise;
  }

  private typeToGenericKnownType(type: string, format?: string, enumValues?: unknown[]):
    [GenericTypeKind.NULL]
    | [GenericTypeKind.PRIMITIVE, GenericPrimitiveKind]
    | [GenericTypeKind.ENUM, AllowedEnumGenericPrimitiveTypes, AllowedEnumTsTypes[]] {

    // TODO: Need to take heed to 'schema.format' for some primitive and/or known types!
    const lcType = type.toLowerCase();
    if (lcType == 'null') {
      return [GenericTypeKind.NULL];
    }

    let primitiveType: GenericPrimitiveKind;
    switch (lcType) {
      case 'number':
        primitiveType = GenericPrimitiveKind.NUMBER;
        break;
      case 'int':
      case 'integer':
        primitiveType = GenericPrimitiveKind.INTEGER;
        break;
      case 'decimal':
      case 'double':
        primitiveType = GenericPrimitiveKind.DECIMAL;
        break;
      case 'float':
        primitiveType = GenericPrimitiveKind.FLOAT;
        break;
      case 'bool':
      case 'boolean':
        primitiveType = GenericPrimitiveKind.BOOL;
        break;
      case 'string':
        primitiveType = GenericPrimitiveKind.STRING;
        break;
      default:
        logger.warn(`Do not know how to handle primitive type '${lcType}', will assume String`);
        primitiveType = GenericPrimitiveKind.STRING;
        break;
    }

    if (enumValues && enumValues.length > 0) {

      let allowedValues: AllowedEnumTsTypes[];
      if (primitiveType == GenericPrimitiveKind.STRING) {
        allowedValues = enumValues.map(it => `${String(it)}`);
      } else if (primitiveType == GenericPrimitiveKind.DECIMAL || primitiveType == GenericPrimitiveKind.FLOAT || primitiveType == GenericPrimitiveKind.NUMBER) {
        allowedValues = enumValues.map(it => Number.parseFloat(`${String(it)}`));
      } else {
        allowedValues = enumValues.map(it => Number.parseInt(`${String(it)}`));
        primitiveType = GenericPrimitiveKind.STRING;
      }

      // TODO: Try to convert the ENUM values into the specified primitive type.
      return [GenericTypeKind.ENUM, primitiveType, allowedValues];
    } else {
      return [GenericTypeKind.PRIMITIVE, primitiveType];
    }
  }

  private async methodToGenericInputType(method: MethodObject): Promise<{ type: GenericType; properties: GenericProperty[] | undefined }> {

    const requestJsonRpcType: GenericPrimitiveType = {
      name: `${method.name}RequestMethod`,
      kind: GenericTypeKind.PRIMITIVE,
      primitiveKind: GenericPrimitiveKind.STRING,
      valueConstant: "2.0",
      nullable: false
    };

    const requestMethodType: GenericPrimitiveType = {
      name: `${method.name}RequestMethod`,
      kind: GenericTypeKind.PRIMITIVE,
      primitiveKind: GenericPrimitiveKind.STRING,
      valueConstant: method.name,
      nullable: false
    };

    // TODO: This should be able to be a String OR Number -- need to make this more generic
    const requestIdType: GenericPrimitiveType = {
      name: `${method.name}RequestId`,
      kind: GenericTypeKind.PRIMITIVE,
      primitiveKind: GenericPrimitiveKind.STRING,
      nullable: false
    };

    let requestParamsType: GenericPropertyOwner;
    if (method.paramStructure == 'by-position') {
      // The params is an array values, and not a map nor properties.
      requestParamsType = <GenericArrayPropertiesByPositionType>{
        name: `${method.name}RequestParams`,
        kind: GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION
      };

      requestParamsType.properties = await Promise.all(
        method.params.map((it) => this.contentDescriptorToGenericProperty(requestParamsType, it))
      );

      // TODO: DO NOT USE ANY JAVA-SPECIFIC METHODS HERE! MOVE THEM SOMEPLACE ELSE IF GENERIC ENOUGH!
      requestParamsType.commonDenominator = JavaUtil.getCommonDenominator(...requestParamsType.properties.map(it => it.type));

    } else {
      requestParamsType = <GenericClassType>{
        name: `${method.name}RequestParams`,
        kind: GenericTypeKind.OBJECT,
        additionalProperties: false
      };

      const properties = await Promise.all(
        method.params.map((it) => this.contentDescriptorToGenericProperty(requestParamsType, it))
      );

      if (properties.length > 0) {
        requestParamsType.properties = properties;
      }
    }

    const requestType = <GenericClassType>{
      name: `${method.name}Request`,
      kind: GenericTypeKind.OBJECT,
      additionalProperties: false,
      description: method.description,
      summary: method.summary,
    };

    requestType.properties = [
      <GenericProperty>{
        name: "jsonrpc",
        type: requestJsonRpcType,
        required: true,
        owner: requestType,
      },
      <GenericProperty>{
        name: "method",
        type: requestMethodType,
        required: true,
        owner: requestType,
      },
      <GenericProperty>{
        name: "id",
        type: requestIdType,
        required: true,
        owner: requestType,
      },
      <GenericProperty>{
        name: "params",
        type: requestParamsType,
        owner: requestType,
      }
    ];

    return {
      type: requestType,
      properties: requestParamsType.properties
    };
  }

  private async linksToGenericContinuations(endpoints: GenericEndpoint[]): Promise<GenericContinuation[]> {

    const continuations: GenericContinuation[] = [];
    const methods = await Promise.all(this._doc.methods.map(method => this.dereference(method)));
    for (const method of methods) {
      const endpoint = endpoints.find(it => it.name == method.object.name);
      if (endpoint) {
        for (const link of (method.object.links || [])) {
          try {

            const dereferenced = await this.dereference(link);
            continuations.push(this.linkToGenericContinuation(endpoint, endpoints, dereferenced.object, dereferenced.ref))
          } catch (ex) {
            logger.error(ex, `Could not build link for ${endpoint.name}`);
          }
        }

      } else {
        logger.error(`There is no endpoint called '${method.object.name}'`);
      }
    }

    return continuations;
  }

  private getTargetEndpoint(name: string, endpoints: GenericEndpoint[]): GenericEndpoint {
    let targetEndpoint = endpoints.find(it => it.name == name);
    if (!targetEndpoint) {
      const options = endpoints.map(it => it.name);
      const choice = name;

      // TODO: Try converting both into PascalCase and compare
      // TODO: Need to mark as "incorrect" somehow, so the documentation can know the Spec is invalid!
      if (this._options.relaxedLookup) {
        const pascalName = pascalCase(name);
        targetEndpoint = endpoints.find(it => pascalCase(it.name) == pascalName);
        if (targetEndpoint) {
          logger.warn(`There is no target endpoint called '${choice || 'N/A'}', WILL ASSUME INVALID CASE '${targetEndpoint.name}'!`);
        }
      }

      if (!targetEndpoint) {
        const closest = this.getClosest(options, choice);
        if (this._options.relaxedLookup && closest.rating >= 0.8) {
          logger.warn(`There is no target endpoint called '${choice || 'N/A'}', WILL ASSUME CLOSE MATCH '${closest.target}'!`);
          targetEndpoint = endpoints.find(it => it.name == closest.target);
        }

        if (!targetEndpoint) {
          const msg = `There is no target endpoint called '${choice || 'N/A'}', did you mean '${closest.target}' (${closest.rating})?`;
          throw new Error(msg);
        }
      }
    }

    return targetEndpoint;
  }

  private linkToGenericContinuation(sourceEndpoint: GenericEndpoint, endpoints: GenericEndpoint[], link: LinkObject, refName?: string): GenericContinuation {

    const targetEndpoint = this.getTargetEndpoint(link.method || sourceEndpoint.name, endpoints);
    const paramNames: string[] = Object.keys(link.params);

    // The request type is always a class type, since it is created as such by us.
    const requestClass = targetEndpoint.request.type as GenericClassType;
    const requestParamsParameter = requestClass.properties?.find(it => it.name == 'params');
    if (!requestParamsParameter) {
      throw new Error(`The target request type must be Class and have a 'params' property`);
    }
    const requestResultClass = requestParamsParameter.type as GenericClassType;

    const mappings: GenericContinuationMapping[] = [];
    for (const linkParamName of paramNames) {

      const requestResultParamParameter = requestResultClass.properties?.find(prop => prop.name == linkParamName);

      if (requestResultParamParameter) {

        const sourceParameter: GenericContinuationSourceParameter = this.getLinkSourceParameter(
          // The first response is the Result, not Error or otherwise.
          sourceEndpoint.responses[0].type,
          sourceEndpoint.request.type,
          link,
          linkParamName
        );

        const targetParameter: GenericContinuationTargetParameter = {
          propertyPath: [
            requestParamsParameter,
            requestResultParamParameter,
          ]
        };

        mappings.push({
          source: sourceParameter,
          target: targetParameter,
        });
      } else {
        logger.warn(`Could not find property '${linkParamName}' in '${Naming.safer(requestResultClass)}'`);
      }
    }

    return <GenericContinuation>{
      name: link.name || refName,
      mappings: mappings,
      description: link.description,
      summary: link.summary,
    };
  }

  private getLinkSourceParameter(primaryType: GenericType, secondaryType: GenericType, link: LinkObject, linkParamName: string): GenericContinuationSourceParameter {

    let value = link.params[linkParamName];
    if (typeof value == 'string') {

      const matcher = this._options.relaxedLookup
        ? OpenRpcParserImpl.PATTERN_PLACEHOLDER_RELAXED
        : OpenRpcParserImpl.PATTERN_PLACEHOLDER;

      const match = matcher.exec(value);

      if (match) {

        // The whole value is just one placeholder.
        // Let's replace it with a property path, which is code-wise more easy to work with.
        const pathString = this._options.relaxedLookup
          ? (match[1] || match[2] || match[3])
          : match[1];

        // const pathString = value.substring(2, value.length - 1);
        const pathParts = pathString.split('.');

        let propertyPath = this.getPropertyPath(primaryType, pathParts);
        if (propertyPath.length !== pathParts.length) {

          // The placeholder might be ${params.x} instead of ${result.x}
          // But ${result.a} makes more sense and is more usual, so we try that first.
          const inputProperties = this.getPropertyPath(secondaryType, pathParts);
          if (inputProperties.length > propertyPath.length) {
            propertyPath = inputProperties;
          } else {
            const primaryName = Naming.safer(primaryType);
            const secondaryName = Naming.safer(secondaryType);
            throw new Error(`There is no property path '${pathString}' in '${primaryName}' nor '${secondaryName}'`);
          }
        }

        return {
          propertyPath: propertyPath
        };
      }
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      constantValue: value
    };
  }

  private getPropertyPath(type: GenericType, pathParts: string[]): GenericProperty[] {
    const propertyPath: GenericProperty[] = [];
    let pointer = type;
    for (let i = 0; i < pathParts.length; i++) {
      if (pointer.kind == GenericTypeKind.OBJECT) {

        const property = pointer.properties?.find(it => it.name == pathParts[i]);
        if (property) {
          propertyPath.push(property);
          pointer = property.type;
        } else {
          return propertyPath;
        }
      } else if (pointer.kind == GenericTypeKind.ARRAY) {

        // The target is an array.
        const indexIndex = pathParts[i].indexOf('[');
        if (indexIndex != -1) {
          // There is an index in the property path. For not the solution is to strip it.
          pathParts[i] = pathParts[i].substring(0, indexIndex);
        }

        // Redirect the type to the type of the content of the array, and go again.
        pointer = pointer.of;
        i--;
      } else {
        throw new Error(`Do not know how to handle '${Naming.safer(type)}' in property path '${pathParts.join('.')}'`);
      }
    }

    return propertyPath;
  }

  getClosest(options: string[], choice: string | undefined): Rating {

    if (!choice) {
      return {
        rating: 0,
        target: ''
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
    return stringSimilarity.findBestMatch(choice, options).bestMatch;
  }

  private async dereference<T>(object: ReferenceObject | T): Promise<{ object: T; ref: string | undefined }> {

    if ('$ref' in object) {
      return {object: await this.dereferenceRecursively<T>(object), ref: object.$ref};
    } else {
      return {object: object, ref: undefined};
    }
  }

  private async dereferenceRecursively<T>(object: ReferenceObject | T): Promise<T> {

    if ('$ref' in object) {
      const cachedPromise = this._derefPromiseMap.get(object.$ref);
      if (cachedPromise) {
        return await cachedPromise as T;
      }

      const promise: Promise<T> = new Promise((resolve, reject) => {
        this.dereferenceRecursivelyUncached<T>(object)
          .then(result => {
            resolve(result);
          })
          .catch(reason => {
            reject(reason);
          });
      });

      this._derefPromiseMap.set(object.$ref, promise);
      return await promise;
    } else {
      return object;
    }
  }

  private async dereferenceRecursivelyUncached<T>(object: ReferenceObject | T): Promise<T> {

    if ('$ref' in object) {
      const deref: ReferenceObject | T = await this.dereferenceInternal(object);
      if ('$ref' in deref) {

        // There were nested $ref, so we need to do The Ugly and merge them.
        const inner = await this.dereferenceRecursively(deref);
        const mix = this.mixRefObjectAndInvalidRefObject<T>(deref, inner);
        return await this.dereferenceRecursively(mix);
      } else {
        return deref;
      }
    } else {
      return object;
    }
  }

  private async dereferenceInternal<T>(object: ReferenceObject | T): Promise<ReferenceObject | T> {

    if ('$ref' in object) {
      return await DefaultReferenceResolver.resolve(object.$ref, this._doc) as T;
    } else {
      return object;
    }
  }

  private mixRefObjectAndInvalidRefObject<T>(object: ReferenceObject, resolved: T | ReferenceObject): T | ReferenceObject {

    const keys = Object.keys(object);
    if (keys.length > 1) {

      const extraKeys = keys.filter(it => (it != '$ref'));
      const copy = {...object};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete (copy as never)['$ref'];
      logger.warn(`Extra keys with $ref ${object.$ref} (${extraKeys.join(', ')}). This is INVALID spec. We allow and merge`);

      // TODO: Use Object.assign instead?
      // TODO: What to do if the property exists in both?
      resolved = {...resolved, ...copy};
    }

    return resolved;
  }
}
