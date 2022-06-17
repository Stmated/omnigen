import {AbstractParser} from '@parse/AbstractParser';

import {
  ComparisonOperator,
  GenericAccessLevel,
  GenericArrayType,
  GenericClassType,
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
  GenericStaticArrayType,
  GenericType,
  GenericTypeKind,
  SchemaFile,
} from '@parse';
import {parseOpenRPCDocument} from '@open-rpc/schema-utils-js';
import {
  ContactObject,
  ContentDescriptorOrReference,
  ErrorOrReference,
  ExampleOrReference,
  ExamplePairingOrReference,
  ExternalDocumentationObject,
  JSONSchema,
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
import {pascalCase} from 'change-case';
import {JavaUtil} from '@java';
import * as stringSimilarity from 'string-similarity';
import {Rating} from 'string-similarity';
import {LoggerFactory} from '@util';
import {DEFAULT_PARSER_OPTIONS, IParserOptions} from '@parse/IParserOptions';

export const logger = LoggerFactory.create(__filename);

// TODO:
// * petstore-expanded -- the classes with inheritance need to implement classes/interfaces correctly
// * petstore-expanded -- if a schema contains inline types inside 'allOf', it should just merge with parent
// * Need to develop a new example with *VERY* complex inheritance structure, and try to convert it
// * Remove the need for the "types" array, and instead do it dynamically by searching for types through whole structure
//    * It can be cached during build-up though, just to make initial lookup while parsing a bit faster
// * simple-math -- check if the examples are actually printed to the right places (make it work like links)
// * Simple way of creating a custom visitor! Remake into interfaces with properties you can re-assign!

export class OpenRpcParser extends AbstractParser {
  private readonly _options: IParserOptions = DEFAULT_PARSER_OPTIONS;

  async parse(schemaFile: SchemaFile): Promise<GenericModel> {
    const schemaObject = await schemaFile.asObject();
    const document = await parseOpenRPCDocument(schemaObject as OpenrpcDocument, {
      dereference: false,
    });
    return this.docToGenericModel(document);
  }
  canHandle(schemaFile: SchemaFile): Promise<boolean> {
    return Promise.resolve(false);
  }

  private async docToGenericModel(doc: OpenrpcDocument): Promise<GenericModel> {
    const types: GenericClassType[] = [];
    const endpoints = await Promise.all(doc.methods.map((method) => this.methodToGenericEndpoint(doc, method, types)));
    const contact = doc.info.contact ? this.contactToGenericContact(doc, doc.info.contact) : undefined;
    const license = doc.info.license ? this.licenseToGenericLicense(doc, doc.info.license) : undefined;
    const servers = (doc.servers || []).map((server) => this.serverToGenericServer(doc, server));
    const docs = doc.externalDocs ? [this.externalDocToGenericExternalDoc(doc, doc.externalDocs)] : [];
    const continuations = await this.linksToGenericContinuations(doc, endpoints);

    const model: GenericModel = {
      schemaType: 'openrpc',
      schemaVersion: doc.openrpc,
      name: doc.info.title,
      description: doc.info.description,
      version: doc.info.version,
      contact: contact,
      license: license,
      termsOfService: doc.info.termsOfService,
      servers: servers,
      externalDocumentations: docs,
      endpoints: endpoints,
      continuations: continuations,
      types: types,
    };

    this.cleanup(model);

    return model;
  }

  private cleanup(model: GenericModel): void {
    const typeNames: string[] = [];
    for (const type of model.types) {
      let usedName: string;
      if (type.name.indexOf('/') !== -1) {
        // The type name contains a slash, which means it is probably a ref name.
        // Just replace the name with the content after the furthest-right slash.
        usedName = type.name.substring(type.name.lastIndexOf('/') + 1);
      } else {
        usedName = type.name;
      }

      const collisionCount = typeNames.filter(it => (it === usedName)).length;
      typeNames.push(usedName);

      if (collisionCount > 0) {
        usedName = `${usedName}${collisionCount + 1}`;
      }

      type.name = usedName;
    }
  }

  private licenseToGenericLicense(doc: OpenrpcDocument, license: LicenseObject): GenericLicense {
    return <GenericLicense>{
      name: license.name,
      url: license.url,
    };
  }

  private contactToGenericContact(doc: OpenrpcDocument, contact: ContactObject): GenericContact {
    return <GenericContact>{
      name: contact.name,
      url: contact.url,
      email: contact.email,
    };
  }

  private async methodToGenericEndpoint(doc: OpenrpcDocument, method: MethodOrReference, types: GenericType[]): Promise<GenericEndpoint> {

    const dereferenced = await this.dereference(doc, method);
    method = dereferenced.object;

    // TODO:
    //   method.tags
    //   method.servers

    const responses: GenericOutput[] = [];

    // One regular response
    const resultResponse = await this.resultToGenericOutputAndResultParamType(doc, method, method.result, types);
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
      responses.push(await this.errorToGenericOutput(doc, pascalCase(method.name), error, types));
    }

    const input = await this.methodToGenericInputType(doc, method, types);
    const requestType = input.type;
    types.push(requestType);

    const examples = await Promise.all(
      (method.examples || []).map((it) => this.examplePairingToGenericExample(doc, resultResponse.type, input.properties, it))
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
        type: requestType
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
      externalDocumentations: method.externalDocs ? [this.externalDocToGenericExternalDoc(doc, method.externalDocs)] : [],
    };
  }

  private async jsonSchemaToType(doc: OpenrpcDocument, names: string[], schema: JSONSchema, types: GenericType[])
    : Promise<{type: GenericType, canInline: boolean}> {
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

    const dereferenced = await this.dereference(doc, schema);
    if (dereferenced.ref) {

      // The ref is the much better unique name of the type.
      //return this.jsonSchemaToType(doc, [dereferenced.ref], dereferenced.object, types);
      schema = dereferenced.object;
      names = [dereferenced.ref];
    }

    if (typeof schema.type === 'string') {
      if (schema.type === 'array') {
        const items = schema.items;
        let arrayItemType: GenericType;
        if (!items) {
          // No items, so the schema for the array items is undefined.
          arrayItemType = {
            name: 'objectArray',
            kind: GenericTypeKind.UNKNOWN,
            additionalProperties: true,
          };
        } else if (typeof items == 'boolean') {
          throw new Error('Do not know how to handle a boolean items');
        } else if (Array.isArray(items)) {
          // items is an array of JSONSchemas. Right now we have no good way of handling this...
          // TODO: We should be introducing interfaces that describe the common denominators between the different items.
          throw new Error('Do not know how to handle multiple items schemas');
        } else {
          // items is a single JSONSchemaObject
          arrayItemType = (await this.jsonSchemaToType(doc, names, items, types)).type;
        }

        return {
          type: <GenericArrayType>{
            name: `ArrayOf${arrayItemType.name}`,
            kind: GenericTypeKind.ARRAY,
            minLength: schema.minItems,
            maxLength: schema.maxItems,
            of: arrayItemType,
          },
          canInline: false,
        };
      } else if (schema.type !== 'object') {
        const t = this.typeToGenericKnownType(schema.type);
        if (t.length == 1) {
          return {
            type: {
              name: schema.type,
              kind: t[0],
            },
            canInline: false,
          };
        } else {
          return {
            type: {
              name: schema.type,
              kind: t[0],
              primitiveKind: t[1],
            },
            canInline: false,
          };
        }
      }
    }

    // TODO: Implement this! How do we convert the JSONSchema into our own type? Need to take heed to $ref and everything else
    // TODO: Rely on ID as the class name? How do we do this?!

    const name = names.join('_');
    const existingType = types.find((type) => type.name === name);
    if (existingType) {
      return {
        type: existingType,
        canInline: false,
      };
    }

    const type: GenericClassType = {
      name: name,
      kind: GenericTypeKind.OBJECT,
      description: schema.description,

      // TODO: This is incorrect. 'additionalProperties' is more advanced than true/false
      additionalProperties: (schema.additionalProperties == undefined
          ? true
          : typeof schema.additionalProperties == 'boolean'
            ? schema.additionalProperties
            : true
      )
    };

    //if (dereferenced.ref) { // TODO: This is wrong -- not only ref components should be added!!!!!!!
      types.push(type);
    //}

    const genericProperties: GenericProperty[] = [];
    const requiredProperties: GenericProperty[] = [];
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        const propertySchema = schema.properties[key] as JSONSchema7;
        const genericProperty = await this.jsonSchema7ToGenericProperty(doc, type, key, propertySchema, types);

        genericProperties.push(genericProperty);
        if (schema.required?.indexOf(key) !== -1) {
          requiredProperties.push(genericProperty);
        }
      }
    }

    type.properties = genericProperties;
    type.requiredProperties = requiredProperties;

    if (schema.not) {
      // ???
    }

    if (schema.multipleOf) {
      // TODO: Make this general, so that all other places call it.
    }

    if (schema.allOf) {
      type.extendsAllOf = await this.gatherTypeExtensions(doc, schema.allOf, type, names, types, true);
    }
    if (schema.anyOf) {
      type.extendsAnyOf = await this.gatherTypeExtensions(doc, schema.anyOf, type, names, types, false);
    }
    if (schema.oneOf) {
      type.extendsOneOf = await this.gatherTypeExtensions(doc, schema.oneOf, type, names, types, false);
    }

    return {
      type: type,

      // If this type is inline in the JSON Schema, without being referenced as a ref:
      // Then we might possibly be able to merge this type with the caller, if it wants to.
      canInline: (dereferenced.ref == undefined)
    };
  }

  private async gatherTypeExtensions(
    doc: OpenrpcDocument,
    sourceSchemas: JSONSchema[],
    parentType: GenericType,
    names: string[],
    types: GenericType[],
    tryInline: boolean)
    : Promise<GenericClassType[]> {

    const extensions: GenericClassType[] = [];
    for (let i = 0; i < sourceSchemas.length; i++) {
      const sub = sourceSchemas[i];
      const conversion = await this.jsonSchemaToType(doc, names.concat([`${i}`]), sub, types);
      if (tryInline && conversion.canInline) {
        // The type that we are extending by is allowed to try to be inlined by its parent,
        // and the type itself says it is allowing the parent to inline it.
        // This can for example me a type inside an 'allOf' that is not a $ref, so used nowhere else.
        const newType = this.mergeType(conversion.type, parentType);
        if (newType) {
          throw new Error(`Do not know how to handle extending from a newly created type ${newType.name}`);
        } else {
          // Remove the type that was merged
          const idx = types.indexOf(conversion.type);
          if (idx !== -1) {
            types.splice(idx, 1);
          }
        }
      } else {
        const genericType = conversion.type;
        if (genericType.kind != GenericTypeKind.ARRAY) {
          if (genericType.kind == GenericTypeKind.OBJECT) {
            extensions.push(genericType);
          } else {
            // TODO: This should probably be supported, since it can be "oneOf" an array of numbers, or something similar?
            throw new Error(`Do not know how to handle non-object extensions (${genericType.kind})`);
          }
        } else {
          throw new Error(`Do not know how to handle inheriting arrays`);
        }
      }
    }

    return extensions;
  }

  /**
   * Will merge between types 'from' into 'to'.
   * If a new type is returned, it means it could not update 'to' object but a whole new type was created.
   * If undefined is returned, it means that the merging was done into the 'to' object silently.
   */
  private mergeType(from: GenericType, to: GenericType): GenericType | undefined {
    if (from.kind == GenericTypeKind.OBJECT && to.kind == GenericTypeKind.OBJECT) {

      to.properties = to.properties || [];
      for (const fromProperty of (from.properties || [])) {
        const toProperty = to.properties.find(p => p.name == fromProperty.name);
        if (!toProperty) {
          // This is a new property, and can just be added to the 'to'.
          to.properties.push({
            ...fromProperty,
            ...{
              owner: to,
            }
          });
        } else {
          // This property already exists, so we should try and find common type.
          const common = JavaUtil.getCommonDenominatorBetween(fromProperty.type, toProperty.type);
          if (common) {
            const idx = to.properties.indexOf(toProperty);
            to.properties.splice(idx, 1);
            to.properties.push({
              ...fromProperty,
              ...{
                owner: to,
                type: common,
              }
            });
          } else {
            const vsString = `${fromProperty.type.name} vs ${toProperty.type.name}`;
            const errMessage = `No common type for merging properties ${fromProperty.name}. ${vsString}`;
            throw new Error(errMessage);
          }
        }
      }

      return undefined;

    } else if (from.kind == GenericTypeKind.PRIMITIVE && to.kind == GenericTypeKind.PRIMITIVE) {

      // TODO: Do not use any Java classes here!
      const common = JavaUtil.getCommonDenominatorBetween(from, to);
      if (common) {
        return common;
      } else {
        throw new Error(`Two primitive types ${from.primitiveKind} and ${to.primitiveKind} do not have common type`);
      }
    } else {
      throw new Error(`Cannot merge two types of different kinds, ${from.kind} vs ${to.kind}`);
    }
  }

  private async jsonSchema7ToGenericProperty(doc: OpenrpcDocument, owner: GenericPropertyOwner, propertyName: string, schema: JSONSchema7, types: GenericType[])
    : Promise<GenericProperty> {
    // This is ugly, but they should pretty much be the same.
    const openRpcJsonSchema = schema as JSONSchema;

    return <GenericProperty>{
      name: propertyName,
      type: (await this.jsonSchemaToType(doc, [], openRpcJsonSchema, types)).type,
      owner: owner
    };
  }

  private async resultToGenericOutputAndResultParamType(doc: OpenrpcDocument, method: MethodObject, result: MethodObjectResult, types: GenericType[]): Promise<{output: GenericOutput, type: GenericType}> {
    if ('name' in result) {
      const typeNamePrefix = pascalCase(method.name);

      // TODO: Should this always be unique, or should we ever use a common inherited method type?
      const resultParameterType = (await this.jsonSchemaToType(doc, [result.name], result.schema, types)).type;
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

      types.push(resultType);

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

    const dereferenced = await DefaultReferenceResolver.resolve(result.$ref, doc) as MethodObjectResult;
    return this.resultToGenericOutputAndResultParamType(doc, method, dereferenced, types);
  }

  private async errorToGenericOutput(doc: OpenrpcDocument, parentName: string, error: ErrorOrReference, types: GenericType[]): Promise<GenericOutput> {
    if ('code' in error) {
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
            name: 'number',
            valueConstant: isUnknownCode ? undefined : error.code,
            kind: GenericTypeKind.PRIMITIVE,
            primitiveKind: GenericPrimitiveKind.INTEGER,
          },
          owner: errorPropertyType,
        },
        {
          name: 'message',
          type: {
            name: 'message',
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
            name: 'object',
            valueConstant: error.data,
            kind: GenericTypeKind.UNKNOWN,
            additionalProperties: true,
          },
          owner: errorPropertyType,
        },
      ];

      types.push(errorPropertyType);

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
            name: 'AlwaysNullResultBody',
            kind: GenericTypeKind.NULL,
          },
          owner: errorType,
        },
        errorProperty,
        {
          name: 'id',
          type: {
            name: 'string',
            kind: GenericTypeKind.PRIMITIVE,
            primitiveKind: GenericPrimitiveKind.STRING,
          },
          owner: errorType,
        },
      ];
      errorType.requiredProperties = [errorProperty];

      types.push(errorType);

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

    const dereferenced = await DefaultReferenceResolver.resolve(error.$ref, doc) as ErrorOrReference;
    return this.errorToGenericOutput(doc, parentName, dereferenced, types);
  }

  private async examplePairingToGenericExample(doc: OpenrpcDocument, valueType: GenericType, inputProperties: GenericProperty[], example: ExamplePairingOrReference): Promise<GenericExamplePairing> {
    if ('name' in example) {
      const params = await Promise.all(
        example.params.map((param, idx) => this.exampleParamToGenericExampleParam(doc, inputProperties, param, idx))
      );

      return <GenericExamplePairing>{
        name: example.name,
        description: example.description,
        summary: example['summary'] as string | undefined, // 'summary' does not exist in the OpenRPC object, but does in spec.
        params: params,
        result: await this.exampleResultToGenericExampleResult(doc, valueType, example.result),
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(example.$ref, doc) as ExamplePairingOrReference;
    return this.examplePairingToGenericExample(doc, valueType, inputProperties, dereferenced);
  }

  private async exampleParamToGenericExampleParam(doc: OpenrpcDocument, inputProperties: GenericProperty[], param: ExampleOrReference, paramIndex: number): Promise<GenericExampleParam> {
    if ('name' in param) {

      // If the name of the example param is the same as the property name, it will match here.
      let property = inputProperties.find(it => it.name == param.name);
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
        name: param.name,
        property: property,
        description: param.description,
        summary: param.summary,
        type: valueType,
        value: param.value,
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(param.$ref, doc) as ExampleOrReference;
    return this.exampleParamToGenericExampleParam(doc, inputProperties, dereferenced, paramIndex);
  }

  private async exampleResultToGenericExampleResult(doc: OpenrpcDocument, valueType: GenericType, example: ExampleOrReference): Promise<GenericExampleResult> {
    if ('name' in example) {

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

    const dereferenced = await DefaultReferenceResolver.resolve(example.$ref, doc) as ExampleOrReference;
    return this.exampleResultToGenericExampleResult(doc, valueType, dereferenced);
  }

  private externalDocToGenericExternalDoc(doc: OpenrpcDocument, documentation: ExternalDocumentationObject): GenericExternalDocumentation {
    return <GenericExternalDocumentation>{
      url: documentation.url,
      description: documentation.description,
    };
  }

  private serverToGenericServer(doc: OpenrpcDocument, server: ServerObject): GenericServer {
    return <GenericServer>{
      name: server.name,
      description: server.description,
      summary: server.summary,
      url: server.url,
      variables: new Map<string, unknown>(Object.entries((server.variables || {}))),
    };
  }

  private async contentDescriptorToGenericProperty(doc: OpenrpcDocument, owner: GenericPropertyOwner, descriptor: ContentDescriptorOrReference, types: GenericType[])
    : Promise<GenericProperty> {
    if ('name' in descriptor) {

      return <GenericProperty>{
        name: descriptor.name,
        description: descriptor.description,
        summary: descriptor.summary,
        deprecated: descriptor.deprecated || false,
        required: descriptor.required || false,
        type: (await this.jsonSchemaToType(doc, [descriptor.name], descriptor.schema, types)).type,
        owner: owner,
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(descriptor.$ref, doc) as ContentDescriptorOrReference;
    return this.contentDescriptorToGenericProperty(doc, owner, dereferenced, types);
  }

  private typeToGenericKnownType(type: string): [GenericTypeKind.NULL] | [GenericTypeKind.PRIMITIVE, GenericPrimitiveKind] {
    switch (type.toLowerCase()) {
      case 'number':
        return [GenericTypeKind.PRIMITIVE, GenericPrimitiveKind.NUMBER];
      case 'int':
      case 'integer':
        return [GenericTypeKind.PRIMITIVE, GenericPrimitiveKind.INTEGER];
      case 'decimal':
      case 'double':
        return [GenericTypeKind.PRIMITIVE, GenericPrimitiveKind.DECIMAL];
      case 'bool':
      case 'boolean':
        return [GenericTypeKind.PRIMITIVE, GenericPrimitiveKind.BOOL];
      case 'string':
        return [GenericTypeKind.PRIMITIVE, GenericPrimitiveKind.STRING];
      case 'null':
        return [GenericTypeKind.NULL];
    }

    throw new Error(`Unknown type: ${type}`);
  }

  private async methodToGenericInputType(doc: OpenrpcDocument, method: MethodObject, types: GenericType[]): Promise<{type: GenericType, properties: GenericProperty[]}>  {

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
      // TODO: DO NOT USE ANY JAVA-SPECIFIC METHODS HERE! MOVE THEM SOMEPLACE ELSE IF GENERIC ENOUGH!
      requestParamsType = <GenericStaticArrayType> {
        name: `${method.name}RequestParams`,
        kind: GenericTypeKind.ARRAY_STATIC
      };

      requestParamsType.properties = await Promise.all(
        method.params.map((it) => this.contentDescriptorToGenericProperty(doc, requestParamsType, it, types))
      );

      requestParamsType.commonDenominator = JavaUtil.getCommonDenominator(...requestParamsType.properties.map(it => it.type));

    } else {
      requestParamsType = <GenericClassType> {
        name: `${method.name}RequestParams`,
        kind: GenericTypeKind.OBJECT,
        additionalProperties: false
      };

      requestParamsType.properties = await Promise.all(
        method.params.map((it) => this.contentDescriptorToGenericProperty(doc, requestParamsType, it, types))
      );

      types.push(requestParamsType);
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

  private async linksToGenericContinuations(doc: OpenrpcDocument, endpoints: GenericEndpoint[]): Promise<GenericContinuation[]> {

    const continuations: Promise<GenericContinuation>[] = [];
    const methods = await Promise.all(doc.methods.map(method => this.dereference(doc, method)));
    for (const method of methods) {
      const endpoint = endpoints.find(it => it.name == method.object.name);
      if (endpoint) {
        for (const link of (method.object.links || [])) {
          continuations.push(
            this.dereference(doc, link)
              .then(link => this.linkToGenericContinuation(doc, endpoint, endpoints, link.object, link.ref))
          );
        }
      } else {
        continuations.push(Promise.reject(new Error(`There is no endpoint called '${method.object.name}'`)));
      }
    }

    return Promise.allSettled(continuations)
    .then(result => {
      const fulfilled: GenericContinuation[] = [];
      for (const entry of result) {
        if (entry.status == 'fulfilled') {
          fulfilled.push(entry.value);
        } else {
          logger.error(`Could not build one of the continuations, ${entry?.reason?.message || ''}`);
        }
      }

      return fulfilled;
    });
  }

  private getTargetEndpoint(name: string, endpoints: GenericEndpoint[]): Promise<GenericEndpoint> {
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
          return Promise.reject(new Error(msg));
        }
      }
    }

    return Promise.resolve(targetEndpoint);
  }

  private async linkToGenericContinuation(doc: OpenrpcDocument, sourceEndpoint: GenericEndpoint, endpoints: GenericEndpoint[], link: LinkObject, refName?: string): Promise<GenericContinuation> {

    const targetEndpoint = await this.getTargetEndpoint(link.method || sourceEndpoint.name, endpoints);
    const paramNames: string[] = Object.keys(link.params);

    // The request type is always a class type, since it is created as such by us.
    const requestClass = targetEndpoint.request.type as GenericClassType;
    const requestParamsParameter = requestClass.properties?.find(it => it.name == 'params');
    if (!requestParamsParameter) {
      return Promise.reject(new Error(`The target request type must be Class and have a 'params' property`));
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
        logger.warn(`Could not find property '${linkParamName}' in '${requestResultClass.name}'`);
      }
    }

    return <GenericContinuation>{
      name: link.name || refName,
      //sourceOutput: sourceEndpoint.responses[0],
      //targetInput: targetEndpoint.request, // The first response is the Result
      mappings: mappings,
      description: link.description,
      summary: link.summary,
    };
  }

  private static readonly PATTERN_PLACEHOLDER = new RegExp(/^[$]{([^}]+)}$/);
  private static readonly PATTERN_PLACEHOLDER_RELAXED = new RegExp(/(?:[$]{([^}]+)}$|^{{([^}]+?)}}$|^[$](.+?)$)/);

  private getLinkSourceParameter(primaryType: GenericType, secondaryType: GenericType, link: LinkObject, linkParamName: string): GenericContinuationSourceParameter {

    let value = link.params[linkParamName];
    if (typeof value == 'string') {

      const matcher = this._options.relaxedLookup
        ? OpenRpcParser.PATTERN_PLACEHOLDER_RELAXED
        : OpenRpcParser.PATTERN_PLACEHOLDER;

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
            throw new Error(`There is no property path '${pathString}' in '${primaryType.name}' nor '${secondaryType.name}'`);
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
    for (let i = 0; i < pathParts.length; i++) {
      if (type.kind == GenericTypeKind.OBJECT) {

        const property = type.properties?.find(it => it.name == pathParts[i]);
        if (property) {
          propertyPath.push(property);
          type = property.type;
        } else {
          return propertyPath;
        }
      } else {
        throw new Error(`Do not know how to handle '${type.name}' in property path '${pathParts.join('.')}'`);
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

  private async dereference<T>(doc: OpenrpcDocument, object: T | ReferenceObject): Promise<{object: T, ref: string | undefined}> {

    if ('$ref' in object) {
      const dereferenced = await DefaultReferenceResolver.resolve(object.$ref, doc) as T;
      return {
        object: (await this.dereference(doc, dereferenced)).object,
        ref: object.$ref
      };
    } else {
      return {object: object, ref: undefined};
    }
  }
}
