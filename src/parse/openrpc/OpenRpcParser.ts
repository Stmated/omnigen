import {AbstractParser} from '@parse/AbstractParser';

import {
  ComparisonOperator,
  GenericAccessLevel,
  GenericArrayType,
  GenericClassType,
  GenericContact,
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
  MethodObject,
  MethodObjectErrors,
  MethodObjectResult,
  MethodOrReference,
  OpenrpcDocument,
  ServerObject,
} from '@open-rpc/meta-schema';
import {JSONSchema7} from 'json-schema';
import {default as DefaultReferenceResolver} from '@json-schema-tools/reference-resolver';
import {pascalCase} from 'change-case';
import {JavaUtil} from '@java';

export class OpenRpcParser extends AbstractParser {
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
    const endpointPromises = doc.methods.map((method) => this.methodToGenericEndpoint(doc, method, types));
    const endpoints = await Promise.all(endpointPromises);
    const contact = doc.info.contact ? this.contactToGenericContact(doc, doc.info.contact) : undefined;
    const license = doc.info.license ? this.licenseToGenericLicense(doc, doc.info.license) : undefined;
    const servers = (doc.servers || []).map((server) => this.serverToGenericServer(doc, server));
    const docs = doc.externalDocs ? [this.externalDocToGenericExternalDoc(doc, doc.externalDocs)] : [];

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

  private async methodToGenericEndpoint(doc: OpenrpcDocument, method: MethodOrReference, types: GenericType[], name?: string): Promise<GenericEndpoint> {
    if ('name' in method) {
      // method.links
      // method.tags
      // method.servers
      // method.params
      // method.paramStructure
      // method.result;

      const responses: GenericOutput[] = [];

      // One regular response
      const resultResponse = await this.resultToGenericOutputAndResultParamType(doc, method, method.result, types);
      responses.push(resultResponse[0]);

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
      const examples = await Promise.all(
        (method.examples || []).map((it) => this.examplePairingToGenericExample(doc, resultResponse[1], it))
      );

      const requestType = await this.methodToGenericInputType(doc, method, types);
      types.push(requestType);

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

    const dereferenced = await DefaultReferenceResolver.resolve(method.$ref, doc) as MethodObject;
    return this.methodToGenericEndpoint(doc, dereferenced, types, method.$ref);
  }

  private async jsonSchemaToType(doc: OpenrpcDocument, names: string[], schema: JSONSchema, types: GenericType[])
    : Promise<GenericType> {
    if (typeof schema == 'boolean') {
      return {
        name: 'boolean',
        kind: GenericTypeKind.PRIMITIVE,
        primitiveKind: GenericPrimitiveKind.BOOL,
      };
    }

    if (schema.$ref) {
      const dereferenced = await DefaultReferenceResolver.resolve(schema.$ref, doc) as JSONSchema;

      // The ref is the much better unique name of the type.
      return this.jsonSchemaToType(doc, [schema.$ref], dereferenced, types);
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
          arrayItemType = await this.jsonSchemaToType(doc, names, items, types);
        }

        return <GenericArrayType>{
          name: `ArrayOf${arrayItemType.name}`,
          kind: GenericTypeKind.ARRAY,
          minLength: schema.minItems,
          maxLength: schema.maxItems,
          of: arrayItemType,
        };
      } else if (schema.type !== 'object') {
        const t = this.typeToGenericKnownType(schema.type);
        if (t.length == 1) {
          return {
            name: schema.type,
            kind: t[0],
          };
        } else {
          return {
            name: schema.type,
            kind: t[0],
            primitiveKind: t[1],
          };
        }
      }
    }

    // TODO: Implement this! How do we convert the JSONSchema into our own type? Need to take heed to $ref and everything else
    // TODO: Rely on ID as the class name? How do we do this?!

    const name = names.join('_');
    const existingType = types.find((type) => type.name === name);
    if (existingType) {
      return existingType;
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
    types.push(type);

    const genericProperties: GenericProperty[] = [];
    const requiredProperties: GenericProperty[] = [];
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        const propertySchema = schema.properties[key] as JSONSchema7;
        const genericProperty = await this.jsonSchema7ToGenericProperty(doc, key, propertySchema, types);

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
      type.extendsAllOf = await this.gatherTypeExtensions(doc, schema.allOf, names, types);
    }
    if (schema.anyOf) {
      type.extendsAnyOf = await this.gatherTypeExtensions(doc, schema.anyOf, names, types);
    }
    if (schema.oneOf) {
      type.extendsOneOf = await this.gatherTypeExtensions(doc, schema.oneOf, names, types);
    }

    return type;
  }

  private async gatherTypeExtensions(doc: OpenrpcDocument, schemaArray: JSONSchema[], names: string[], types: GenericType[])
    : Promise<GenericClassType[]> {
    const typeExtendsAnyOf: GenericClassType[] = [];
    for (let i = 0; i < schemaArray.length; i++) {
      const sub = schemaArray[i];
      const genericType = await this.jsonSchemaToType(doc, names.concat([`${i}`]), sub, types);
      if (genericType.kind != GenericTypeKind.ARRAY) {
        if (genericType.kind == GenericTypeKind.OBJECT) {
          typeExtendsAnyOf.push(genericType);
        } else {
          // TODO: This should probably be supported, since it can be "oneOf" an array of numbers, or something similar?
          throw new Error(`Do not know how to handle non-object extensions (${genericType.kind})`);
        }
      } else {
        throw new Error(`Do not know how to handle inheriting arrays`);
      }
    }

    return typeExtendsAnyOf;
  }

  private async jsonSchema7ToGenericProperty(doc: OpenrpcDocument, propertyName: string, schema: JSONSchema7, types: GenericType[])
    : Promise<GenericProperty> {
    // This is ugly, but they should pretty much be the same.
    const openRpcJsonSchema = schema as JSONSchema;

    return <GenericProperty>{
      name: propertyName,
      type: await this.jsonSchemaToType(doc, [], openRpcJsonSchema, types),
    };
  }

  private async resultToGenericOutputAndResultParamType(doc: OpenrpcDocument, method: MethodObject, result: MethodObjectResult, types: GenericType[]): Promise<[GenericOutput, GenericType]> {
    if ('name' in result) {
      const typeNamePrefix = pascalCase(method.name);

      // TODO: Should this always be unique, or should we ever use a common inherited method type?
      const resultParameterType = await this.jsonSchemaToType(doc, [result.name], result.schema, types);
      const resultType: GenericType = {
        name: `${typeNamePrefix}Response`,
        kind: GenericTypeKind.OBJECT,
        additionalProperties: false,
        description: method.description,
        summary: method.summary,
        properties: [
          {
            name: 'result',
            type: resultParameterType,
          },
          {
            name: 'error',
            type: {
              name: `${typeNamePrefix}ResultError`,
              kind: GenericTypeKind.NULL,
            },
          },
          {
            name: 'id',
            type: {
              name: `${typeNamePrefix}ResultId`,
              kind: GenericTypeKind.PRIMITIVE,
              primitiveKind: GenericPrimitiveKind.STRING,
            },
          },
        ],
      };

      types.push(resultType);

      return [
        <GenericOutput>{
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
        resultParameterType
      ];
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
        properties: [
          // For Trustly we also have something called "Name", which is always "name": "JSONRPCError",
          {
            name: 'code',
            type: {
              name: 'number',
              valueConstant: isUnknownCode ? undefined : error.code,
              kind: GenericTypeKind.PRIMITIVE,
              primitiveKind: GenericPrimitiveKind.INTEGER,
            },
          },
          {
            name: 'message',
            type: {
              name: 'message',
              valueConstant: error.message,
              kind: GenericTypeKind.PRIMITIVE,
              primitiveKind: GenericPrimitiveKind.STRING,
            },
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
          },
        ],
      };

      const errorProperty: GenericProperty = {
        name: 'error',
        type: errorPropertyType,
      };

      types.push(errorPropertyType);

      const errorType: GenericClassType = {
        name: typeName,
        accessLevel: GenericAccessLevel.PUBLIC,
        kind: GenericTypeKind.OBJECT,
        additionalProperties: false,
        properties: [
          {
            name: 'result',
            type: {
              name: 'AlwaysNullResultBody',
              kind: GenericTypeKind.NULL,
            },
          },
          errorProperty,
          {
            name: 'id',
            type: {
              name: 'string',
              kind: GenericTypeKind.PRIMITIVE,
              primitiveKind: GenericPrimitiveKind.STRING,
            },
          },
        ],
        requiredProperties: [errorProperty],
      };

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

  private async examplePairingToGenericExample(doc: OpenrpcDocument, valueType: GenericType, example: ExamplePairingOrReference): Promise<GenericExamplePairing> {
    if ('name' in example) {
      const paramPromises = example.params.map((param) => this.exampleParamToGenericExampleParam(doc, param));
      const params = await Promise.all(paramPromises);

      return <GenericExamplePairing>{
        name: example.name,
        description: example.description,
        summary: example['summary'] as string | undefined, // 'summary' does not exist in the OpenRPC object, but does in spec.
        params: params,
        result: await this.exampleResultToGenericExampleResult(doc, valueType, example.result),
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(example.$ref, doc) as ExamplePairingOrReference;
    return this.examplePairingToGenericExample(doc, valueType, dereferenced);
  }

  private async exampleParamToGenericExampleParam(doc: OpenrpcDocument, param: ExampleOrReference): Promise<GenericExampleParam> {
    if ('name' in param) {
      return <GenericExampleParam>{
        name: param.name,
        description: param.description,
        summary: param.summary,
        value: param.value,
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(param.$ref, doc) as ExampleOrReference;
    return this.exampleParamToGenericExampleParam(doc, dereferenced);
  }

  private async exampleResultToGenericExampleResult(doc: OpenrpcDocument, valueType: GenericType, example: ExampleOrReference): Promise<GenericExampleResult> {
    if ('name' in example) {

      if (example['externalValue']) {

        // This is part of the specification, but not part of the OpenRPC interface.
      }

      // if (typeof example.value == 'string') {
      //
      //   // If the type of the value is a string, then maybe it is a JSON payload.
      //   // If it is, then we should prettify it to keep the same look as other examples.
      // }

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

  private async contentDescriptorToGenericProperty(doc: OpenrpcDocument, descriptor: ContentDescriptorOrReference, types: GenericType[])
    : Promise<GenericProperty> {
    if ('name' in descriptor) {

      return <GenericProperty>{
        name: descriptor.name,
        description: descriptor.description,
        summary: descriptor.summary,
        deprecated: descriptor.deprecated || false,
        required: descriptor.required || false,
        type: await this.jsonSchemaToType(doc, [descriptor.name], descriptor.schema, types),
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(descriptor.$ref, doc) as ContentDescriptorOrReference;
    return this.contentDescriptorToGenericProperty(doc, dereferenced, types);
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

  private async methodToGenericInputType(doc: OpenrpcDocument, method: MethodObject, types: GenericType[]): Promise<GenericType>  {

    const properties = await Promise.all(
      method.params.map((it) => this.contentDescriptorToGenericProperty(doc, it, types))
    );

    // jsonrpc
    // A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".

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

    // The params is an array values, and not a map nor properties.
    // TODO: DO NOT USE ANY JAVA-SPECIFIC METHODS HERE! MOVE THEM SOMEPLACE ELSE IF GENERIC ENOUGH!
    // const commonType = JavaUtil.getCommonDenominator(...properties.map(it => it.type));
    const requestParamsType: GenericClassType = {
      name: `${method.name}RequestParams`,
      kind: GenericTypeKind.OBJECT,
      properties: properties,
      additionalProperties: false,
      // of: properties.map(it => {
      //   return {
      //     name: it.name || it.type.name,
      //     description: it.description,
      //     summary: it.summary,
      //     type: it.type
      //   };
      // }),
    };

    types.push(requestParamsType);

    return <GenericClassType>{
      name: `${method.name}Request`,
      kind: GenericTypeKind.OBJECT,
      additionalProperties: false,
      description: method.description,
      summary: method.summary,
      properties: [
        <GenericProperty>{
          name: "jsonrpc",
          type: requestJsonRpcType,
          required: true
        },
        <GenericProperty>{
          name: "method",
          type: requestMethodType,
          required: true
        },
        <GenericProperty>{
          name: "id",
          type: requestIdType,
          required: true
        },
        <GenericProperty>{
          name: "params",
          type: requestParamsType
        }
      ]
    };
  }
}
