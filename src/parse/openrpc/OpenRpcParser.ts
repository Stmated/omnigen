import {AbstractParser} from '@parse/AbstractParser';

import {
  ComparisonOperator,
  GenericAccessLevel,
  GenericArrayType,
  GenericContact,
  GenericEndpoint,
  GenericExamplePairing,
  GenericExampleParam,
  GenericExampleResult,
  GenericExternalDocumentation,
  GenericKnownType,
  GenericLicense,
  GenericModel,
  GenericOutput,
  GenericParameter,
  GenericPayloadPathQualifier,
  GenericProperty,
  GenericServer,
  GenericType,
  GenericTypeOrGenericArrayType,
} from '@model';
import {SchemaFile} from '@parse';
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

export class OpenRpcParser extends AbstractParser {
  async parse(schemaFile: SchemaFile): Promise<GenericModel> {
    const schemaObject = await schemaFile.asObject();
    const document = await parseOpenRPCDocument(schemaObject as OpenrpcDocument, {
      dereference: false,
    });
    return this.docToGenericModel(document);
  }

  private async docToGenericModel(doc: OpenrpcDocument): Promise<GenericModel> {
    const types: GenericType[] = [];
    const endpointPromises = doc.methods.map((method) => this.methodToGenericEndpoint(doc, method, types));
    const endpoints = await Promise.all(endpointPromises);

    return Promise.resolve(<GenericModel>{
      schemaType: 'openrpc',
      schemaVersion: doc.openrpc,
      name: doc.info.title,
      description: doc.info.description,
      version: doc.info.version,
      contact: doc.info.contact ? this.contactToGenericContact(doc, doc.info.contact) : undefined,
      license: doc.info.license ? this.licenseToGenericLicense(doc, doc.info.license) : undefined,
      termsOfService: doc.info.termsOfService,
      servers: (doc.servers || []).map((server) => this.serverToGenericServer(doc, server)),
      externalDocumentations: doc.externalDocs ? [this.externalDocToGenericExternalDoc(doc, doc.externalDocs)] : [],

      endpoints: endpoints,
      types: types,
    });
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
      responses.push(await this.resultToGenericOutput(doc, method, method.result, types));

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
        responses.push(await this.errorToGenericOutput(doc, error, types));
      }

      const paramPromises = method.params.map((param) => this.paramToGenericParameter(doc, param, types));
      const params = await Promise.all(paramPromises);

      const examplePromises = (method.examples || []).map((example) => this.examplePairingToGenericExample(doc, example));
      const examples = await Promise.all(examplePromises);

      return <GenericEndpoint>{
        name: method.name,
        description: method.description,
        summary: method.summary,
        async: false,
        path: '',
        request: {
          contentType: 'application/json',
          description: '',
        },
        parameters: params,
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
    : Promise<GenericTypeOrGenericArrayType> {
    if (typeof schema == 'boolean') {
      return {
        name: 'boolean',
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
        let arrayItemType: GenericTypeOrGenericArrayType;
        if (!items) {
          // No items, so the schema for the array items is undefined.
          arrayItemType = {
            name: 'objectArray',
            knownType: GenericKnownType.UNKNOWN,
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
          minLength: schema.minItems,
          maxLength: schema.maxItems,
          of: arrayItemType,
        };
      } else if (schema.type !== 'object') {
        return {
          name: schema.type,
          knownType: this.typeToGenericKnownType(schema.type),
        };
      }
    }

    // TODO: Implement this! How do we convert the JSONSchema into our own type? Need to take heed to $ref and everything else
    // TODO: Rely on ID as the class name? How do we do this?!

    const name = names.join('_');
    const existingType = types.find((type) => type.name === name);
    if (existingType) {
      return existingType;
    }

    const type: GenericType = {
      name: name,
    };
    types.push(type);

    const genericProperties: GenericProperty[] = [];
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        const propertySchema = schema.properties[key] as JSONSchema7;
        const isRequired = schema.required?.indexOf(key) !== -1;
        const genericProperty = await this.jsonSchema7ToGenericProperty(doc, key, isRequired, propertySchema, types);
        genericProperties.push(genericProperty);
      }
    }

    type.properties = genericProperties;

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

  private async gatherTypeExtensions(doc: OpenrpcDocument, schemaArray: JSONSchema[], names: string[], types: GenericType[]): Promise<GenericType[]> {
    const typeExtendsAnyOf: GenericType[] = [];
    for (let i = 0; i < schemaArray.length; i++) {
      const sub = schemaArray[i];
      const genericType = await this.jsonSchemaToType(doc, names.concat([`${i}`]), sub, types);
      if (!('of' in genericType)) {
        typeExtendsAnyOf.push(genericType);
      } else {
        throw new Error(`Do not know how to handle inheriting arrays`);
      }
    }

    return typeExtendsAnyOf;
  }

  private async jsonSchema7ToGenericProperty(doc: OpenrpcDocument, propertyName: string, required: boolean, schema: JSONSchema7, types: GenericType[]): Promise<GenericProperty> {
    // This is ugly, but they should pretty much be the same.
    const openRpcJsonSchema = schema as JSONSchema;

    return <GenericProperty>{
      name: propertyName,
      required: required,
      type: await this.jsonSchemaToType(doc, [], openRpcJsonSchema, types),
    };
  }

  private async resultToGenericOutput(doc: OpenrpcDocument, method: MethodObject, result: MethodObjectResult, types: GenericType[]): Promise<GenericOutput> {
    if ('name' in result) {
      const typeNamePrefix = pascalCase(method.name);
      return <GenericOutput>{
        name: result.name,
        description: result.description,
        summary: result.summary,
        deprecated: result.deprecated || false,
        required: result.required,
        type: {
          name: `${typeNamePrefix}Result`,
          properties: [
            {
              name: 'result',
              type: await this.jsonSchemaToType(doc, [result.name], result.schema, types),
            },
            {
              name: 'error',
              type: {
                name: `${typeNamePrefix}ResultError`,
                valueConstant: null,
              },
            },
            {
              name: 'id',
              type: {
                name: `${typeNamePrefix}ResultId`,
                knownType: GenericKnownType.STRING,
              },
            },
          ],
        },
        contentType: 'application/json',
        qualifiers: [
          {
            path: ['result'],
            operator: ComparisonOperator.DEFINED,
          },
        ],
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(result.$ref, doc) as MethodObjectResult;
    return this.resultToGenericOutput(doc, method, dereferenced, types);
  }

  private async errorToGenericOutput(doc: OpenrpcDocument, error: ErrorOrReference, types: GenericType[]): Promise<GenericOutput> {
    if ('code' in error) {
      const actualCode = (error.code === -1234567890) ? 0 : error.code;
      const typeName = `Error${actualCode}`;

      const errorProperty: GenericProperty = {
        name: 'error',
        type: {
          name: 'string',
          properties: [
            // For Trustly we also have something called "Name", which is always "name": "JSONRPCError",
            {
              name: 'code',
              type: {
                name: 'number',
                valueConstant: (actualCode == error.code) ? error.code : undefined,
                knownType: GenericKnownType.INTEGER,
              },
            },
            {
              name: 'message',
              type: {
                name: 'message',
                valueConstant: error.message,
                knownType: GenericKnownType.STRING,
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
                knownType: GenericKnownType.UNKNOWN,
              },
            },
          ],
        },
      };

      const errorType: GenericType = {
        name: typeName,
        accessLevel: GenericAccessLevel.PUBLIC,
        properties: [
          {
            name: 'result',
            type: {
              name: 'string',
              valueConstant: null,
              knownType: GenericKnownType.STRING,
            },
          },
          errorProperty,
          {
            name: 'id',
            type: {
              name: 'string',
              knownType: GenericKnownType.STRING,
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

      if (error.code === actualCode) {
        qualifiers.push({
          path: ['error', 'code'],
          operator: ComparisonOperator.EQUALS,
          value: error.code,
        });
      }

      return <GenericOutput>{
        name: `error-${actualCode}`,
        deprecated: false,
        required: false,
        type: errorType,
        contentType: 'application/json',
        qualifiers: qualifiers,
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(error.$ref, doc) as ErrorOrReference;
    return this.errorToGenericOutput(doc, dereferenced, types);
  }

  private async examplePairingToGenericExample(doc: OpenrpcDocument, example: ExamplePairingOrReference): Promise<GenericExamplePairing> {
    if ('name' in example) {
      const paramPromises = example.params.map((param) => this.exampleParamToGenericExampleParam(doc, param));
      const params = await Promise.all(paramPromises);

      return <GenericExamplePairing>{
        name: example.name,
        description: example.description,
        params: params,
        result: await this.exampleResultToGenericExampleResult(doc, example.result),
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(example.$ref, doc) as ExamplePairingOrReference;
    return this.examplePairingToGenericExample(doc, dereferenced);
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

  private async exampleResultToGenericExampleResult(doc: OpenrpcDocument, param: ExampleOrReference): Promise<GenericExampleResult> {
    if ('name' in param) {
      return <GenericExampleResult>{
        name: param.name,
        description: param.description,
        summary: param.summary,
        value: param.value,
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(param.$ref, doc) as ExampleOrReference;
    return this.exampleResultToGenericExampleResult(doc, dereferenced);
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

  canHandle(schemaFile: SchemaFile): Promise<boolean> {
    return Promise.resolve(false);
  }

  private async paramToGenericParameter(doc: OpenrpcDocument, parameter: ContentDescriptorOrReference, types: GenericType[])
    : Promise<GenericParameter> {
    if ('name' in parameter) {
      // parameter.schema
      return <GenericParameter>{
        name: parameter.name,
        description: parameter.description,
        summary: parameter.summary,
        deprecated: parameter.deprecated || false,
        required: parameter.required || false,
        type: await this.jsonSchemaToType(doc, [parameter.name], parameter.schema, types),
      };
    }

    const dereferenced = await DefaultReferenceResolver.resolve(parameter.$ref, doc) as ContentDescriptorOrReference;
    return this.paramToGenericParameter(doc, dereferenced, types);
  }

  private typeToGenericKnownType(type: string): GenericKnownType {
    switch (type.toLowerCase()) {
      case 'number':
        return GenericKnownType.NUMBER;
      case 'int':
      case 'integer':
        return GenericKnownType.INTEGER;
      case 'decimal':
      case 'double':
        return GenericKnownType.DECIMAL;
      case 'bool':
      case 'boolean':
        return GenericKnownType.BOOL;
      case 'string':
        return GenericKnownType.STRING;
      case 'null':
        return GenericKnownType.NULL;
    }

    throw new Error(`Unknown type: ${type}`);
  }
}
