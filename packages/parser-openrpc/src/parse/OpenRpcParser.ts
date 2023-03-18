import {
  DEFAULT_PARSER_OPTIONS,
  IncomingOptions,
  OMNI_GENERIC_FEATURES,
  OmniAccessLevel,
  OmniArrayPropertiesByPositionType,
  OmniComparisonOperator,
  OmniContact,
  OmniEndpoint,
  OmniExamplePairing,
  OmniExampleParam,
  OmniExampleResult,
  OmniExternalDocumentation,
  OmniLicense,
  OmniLink,
  OmniLinkMapping,
  OmniLinkSourceParameter,
  OmniLinkTargetParameter,
  OmniModel,
  OmniModelParserResult,
  OmniObjectType,
  OmniOutput,
  OmniPayloadPathQualifier,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyOwner,
  OmniServer,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  OptionAdditions,
  OptionResolvers,
  OptionsSource,
  Parser,
  ParserBootstrap,
  ParserBootstrapFactory,
  ParserOptions,
  RealOptions,
  SchemaSource,
  TargetOptions,
  TypeName,
} from '@omnigen/core';
import {Case, Dereferenced, Dereferencer, OmniUtil, OptionsUtil, PARSER_OPTIONS_RESOLVERS} from '@omnigen/core-util';
import {parseOpenRPCDocument} from '@open-rpc/schema-utils-js';
import {
  ContactObject,
  ContentDescriptorObject,
  ErrorObject,
  ExampleObject,
  ExamplePairingObject,
  ExternalDocumentationObject,
  JSONSchemaObject,
  LicenseObject,
  LinkObject,
  MethodObject,
  MethodObjectErrors,
  OpenrpcDocument,
  ServerObject,
} from '@open-rpc/meta-schema';
import {JSONSchema7} from 'json-schema';
import * as stringSimilarity from 'string-similarity';
import {Rating} from 'string-similarity';
import {LoggerFactory} from '@omnigen/core-log';
import * as path from 'path';
import {
  DEFAULT_JSONRPC_OPTIONS,
  JSONRPC_OPTIONS_FALLBACK,
  JSONRPC_OPTIONS_RESOLVERS,
  JsonRpcParserOptions,
} from '../options/index.js';
import {JsonSchemaParser, SchemaToTypeResult} from '@omnigen/parser-jsonschema';

const logger = LoggerFactory.create(import.meta.url);

type OutputAndType = { output: OmniOutput; type: OmniType };
type TypeAndProperties = { type: OmniType; properties: OmniProperty[] | undefined };

export type OpenRpcParserOptions = JsonRpcParserOptions & ParserOptions;

export const OPENRPC_OPTIONS_RESOLVERS: OptionResolvers<OpenRpcParserOptions> = {
  ...JSONRPC_OPTIONS_RESOLVERS,
  ...PARSER_OPTIONS_RESOLVERS,
};

export const DEFAULT_OPENRPC_OPTIONS: OpenRpcParserOptions = {
  ...DEFAULT_PARSER_OPTIONS,
  ...DEFAULT_JSONRPC_OPTIONS,
};

export const OPENRPC_OPTIONS_FALLBACK: OptionAdditions<OpenRpcParserOptions> = {
  jsonRpcVersion: value => {
    if (JSONRPC_OPTIONS_FALLBACK.jsonRpcVersion) {

      const jsonRpcFallback = JSONRPC_OPTIONS_FALLBACK.jsonRpcVersion(value);
      if (!jsonRpcFallback) {
        throw new Error(`There must be a JsonRpc options fallback registered`);
      }

      const realOpenRpcOptions: OpenRpcParserOptions = {
        ...DEFAULT_OPENRPC_OPTIONS,
        ...DEFAULT_PARSER_OPTIONS,
        ...jsonRpcFallback,
      };

      // Not necessarily true, since we do not know what properties the JSONRpc fallback will give.
      // But we will simply have to trust that it is so... or many things will break.
      return realOpenRpcOptions as RealOptions<OpenRpcParserOptions>;
    } else {
      throw new Error(`There must be a JsonRpc options fallback registered`);
    }
  },
};

export class OpenRpcParserBootstrapFactory implements ParserBootstrapFactory<OpenRpcParserOptions> {

  async createParserBootstrap(schemaSource: SchemaSource): Promise<ParserBootstrap<OpenRpcParserOptions>> {

    const schemaObject = await schemaSource.asObject();
    const document = await parseOpenRPCDocument(schemaObject as OpenrpcDocument, {
      dereference: false,
    });

    const absolutePath = schemaSource.getAbsolutePath();
    if (!absolutePath) {
      throw new Error(`The schema file must have a path, to able to dereference documents`);
    }

    const baseUri = path.dirname(absolutePath);
    const dereferencer = await Dereferencer.create<OpenrpcDocument>(baseUri, absolutePath, document);

    return new OpenRpcParserBootstrap(dereferencer);
  }
}

export class OpenRpcParserBootstrap implements ParserBootstrap<OpenRpcParserOptions>, OptionsSource<OpenRpcParserOptions> {

  private readonly _deref: Dereferencer<OpenrpcDocument>;

  constructor(deref: Dereferencer<OpenrpcDocument>) {
    this._deref = deref;
  }

  getIncomingOptions<TTargetOptions extends TargetOptions>(): IncomingOptions<OpenRpcParserOptions & TTargetOptions> | undefined {
    const doc = this._deref.getFirstRoot();
    const customOptions = doc['x-omnigen'] as IncomingOptions<OpenRpcParserOptions & TTargetOptions>;

    return customOptions;
  }

  createParser(options: RealOptions<OpenRpcParserOptions>): Parser<OpenRpcParserOptions> {

    const opt = {...options}; // Copy the options, so we do not manipulate the given object.
    OptionsUtil.updateOptionsFromDocument(this._deref.getFirstRoot(), opt);

    return new OpenRpcParser(this._deref, options);
  }
}

/**
 * TODO: Remove this class, keep the global variables in the class above
 */
export class OpenRpcParser implements Parser<OpenRpcParserOptions> {

  static readonly PATTERN_PLACEHOLDER = new RegExp(/^[$]{([^}]+)}$/);
  static readonly PATTERN_PLACEHOLDER_RELAXED = new RegExp(/(?:[$]{([^}]+)}$|^{{([^}]+?)}}$|^[$](.+?)$)/);

  private readonly _options: RealOptions<OpenRpcParserOptions>;

  private _unknownError?: OmniOutput;

  private readonly _preferablyUniqueErrorLogs = new Set<string>();

  // These classes should be optionally created.
  // Used (only?) if:
  // * we are going to automatically try and create generics.
  // * some setting is set to create helper classes
  // TODO: Need to figure out a way of having multiple code generations using these same classes (since they are generic)
  private _jsonRpcRequestClass?: OmniObjectType;
  private _jsonRpcResponseClass?: OmniObjectType;
  private _jsonRpcErrorResponseClass?: OmniObjectType;
  private _jsonRpcErrorInstanceClass?: OmniObjectType;

  // This class should be optionally created if we are going to try and create generics.
  // It is only going to work like a marker interface, so we can know that all the classes are related.
  // TODO: Need to figure out a way of having multiple code generations using these same classes (since they are generic)
  private _requestParamsClass?: OmniObjectType; // Used

  private readonly _deref: Dereferencer<OpenrpcDocument>;
  private readonly _jsonSchemaParser: JsonSchemaParser<OpenrpcDocument, OpenRpcParserOptions>;

  private get doc(): OpenrpcDocument {
    return this._deref.getFirstRoot();
  }

  constructor(dereferencer: Dereferencer<OpenrpcDocument>, options: RealOptions<OpenRpcParserOptions>) {
    this._deref = dereferencer;
    this._options = options;
    this._jsonSchemaParser = new JsonSchemaParser(this._deref, this._options);
  }

  parse(): OmniModelParserResult<OpenRpcParserOptions> {

    const endpoints = this.doc.methods.map(it => this.toOmniEndpointFromMethod(this._deref.get(it, this._deref.getFirstRoot())));
    const contact = this.doc.info.contact ? this.toOmniContactFromContact(this.doc.info.contact) : undefined;
    const license = this.doc.info.license ? this.toOmniLicenseFromLicense(this.doc.info.license) : undefined;
    const servers = (this.doc.servers || []).map(server => this.toOmniServerFromServerObject(server));
    const docs = this.doc.externalDocs ? [this.toOmniExternalDocumentationFromExternalDocumentationObject(this.doc.externalDocs)] : [];
    const continuations = endpoints.flatMap(it => this.toOmniLinkFromDocMethods(it, endpoints));

    // Now find all the types that were not referenced by a method, but is in the contract.
    // We most likely still want those types to be included.
    // const extraTypes: OmniType[] = [];
    if (this.doc.components?.schemas) {
      for (const key of Object.keys(this.doc.components.schemas)) {
        const schema = this.doc.components.schemas[key] as JSONSchemaObject;
        const deref = this._deref.get(schema, this._deref.getFirstRoot());
        const unwrapped = this._jsonSchemaParser.unwrapJsonSchema(deref);

        // Call to get the type from the schema.
        // That way we make sure it's in the type map.
        this._jsonSchemaParser.jsonSchemaToType(deref.hash || key, unwrapped, `/components/schemas/${key}`);
      }
    }

    const model: OmniModel = {
      schemaType: 'openrpc',
      schemaVersion: this.doc.openrpc,
      name: this.doc.info.title,
      description: this.doc.info.description,
      version: this.doc.info.version,
      contact: contact,
      license: license,
      termsOfService: this.doc.info.termsOfService,
      servers: servers,
      externalDocumentations: docs,
      endpoints: endpoints,
      continuations: continuations,
      types: this._jsonSchemaParser.getTypes(),
    };

    this._jsonSchemaParser.executePostCleanup(model);

    return {
      model: model,
      options: this._options,
    };
  }

  toOmniLicenseFromLicense(license: LicenseObject): OmniLicense {
    return <OmniLicense>{
      name: license.name,
      url: license.url,
    };
  }

  toOmniContactFromContact(contact: ContactObject): OmniContact {
    return <OmniContact>{
      name: contact.name,
      url: contact.url,
      email: contact.email,
    };
  }

  toOmniEndpointFromMethod(method: Dereferenced<MethodObject>): OmniEndpoint {

    const typeAndProperties = this.toTypeAndPropertiesFromMethod(method);

    const resultResponse = this.toOmniOutputFromContentDescriptor(
      method.obj,
      this._deref.get(method.obj.result, method.root),
    );

    const responses: OmniOutput[] = [];

    // One regular response
    responses.push(resultResponse.output);

    // And then one response for each potential error
    const errorsOrReferences: MethodObjectErrors = method.obj.errors || [];

    // We will always add the generic error classes, since we can never trust that the server will be truthful.
    errorsOrReferences.push({
      code: -1234567890,
      message: 'Unknown Error',
    });

    const errorOutputs = errorsOrReferences.map(it => {
      const deref = this._deref.get(it, method.root);
      return this.errorToGenericOutput(Case.pascal(method.obj.name), deref);
    });

    responses.push(...errorOutputs);

    const examples = (method.obj.examples || []).map(it => {
      const deref = this._deref.get(it, method.root);
      return this.examplePairingToGenericExample(resultResponse.type, typeAndProperties.properties || [], deref);
    });

    // TODO: Remake so that the request body is another type!
    //  The parameters build into an object
    //  -- for other specifications, the parameters end up in the URL and headers maybe! That's a later problem!
    // TODO: Also need to handle the "required" in a good way. JSR-303 annotations? If-cases? Both?

    return {
      name: method.obj.name,
      description: method.obj.description,
      summary: method.obj.summary,
      async: false,
      path: '',
      request: {
        contentType: 'application/json',
        type: typeAndProperties.type,
      },
      requestQualifiers: [
        {
          path: ['method'],
          operator: OmniComparisonOperator.EQUALS,
          value: method.obj.name,
        },
      ],
      responses: responses,
      deprecated: method.obj.deprecated || false,
      examples: examples,
      externalDocumentations: method.obj.externalDocs
        ? [this.toOmniExternalDocumentationFromExternalDocumentationObject(method.obj.externalDocs)]
        : [],
    };
  }

  private toOmniTypeFromContentDescriptor(
    contentDescriptor: Dereferenced<ContentDescriptorObject>,
    fallbackName?: TypeName,
  ): SchemaToTypeResult {

    const derefSchema = this._jsonSchemaParser.unwrapJsonSchema({
      obj: contentDescriptor.obj.schema,
      root: contentDescriptor.root,
    });

    const preferredName = this.getPreferredContentDescriptorName(derefSchema, contentDescriptor, fallbackName);
    return this._jsonSchemaParser.jsonSchemaToType(preferredName, derefSchema, contentDescriptor.hash);
  }

  private getPreferredContentDescriptorName(
    schema: Dereferenced<JSONSchema7>,
    contentDescriptor: Dereferenced<ContentDescriptorObject>,
    fallbackName?: TypeName,
  ): TypeName {

    const names = this._jsonSchemaParser.getMostPreferredNames(contentDescriptor, schema);
    names.push(contentDescriptor.obj.name);
    if (fallbackName) {
      names.push(fallbackName);
    }
    if (contentDescriptor.obj && contentDescriptor.obj.description && contentDescriptor.obj.description.length < 20) {
      // Very ugly, but it's something?
      names.push(Case.pascal(contentDescriptor.obj.description));
    }
    names.push(...this._jsonSchemaParser.getFallbackNamesOfJsonSchemaType(schema));

    return names;
  }

  private toOmniOutputFromContentDescriptor(method: MethodObject, contentDescriptor: Dereferenced<ContentDescriptorObject>): OutputAndType {

    const typeNamePrefix = Case.pascal(method.name);

    // TODO: Should this always be unique, or should we ever use a common inherited method type?
    // TODO: Reuse the code from contentDescriptorToGenericProperty -- so they are ALWAYS THE SAME
    const resultParameterType = this.toOmniTypeFromContentDescriptor(
      contentDescriptor,
      `${typeNamePrefix}ResponsePayload`,
    );

    const resultType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: `${typeNamePrefix}Response`,
      additionalProperties: false,
      properties: [],
      description: method.description,
      summary: method.summary,
    };

    OpenRpcParser.addJsonRpcResponseProperties(resultType, method, this._options);

    if (!this._jsonRpcResponseClass) {

      const jsonRpcResponseClassName = 'JsonRpcResponse'; // TODO: Make it a setting

      this._jsonRpcResponseClass = {
        kind: OmniTypeKind.OBJECT,
        name: jsonRpcResponseClassName,
        description: `Generic class to describe the JsonRpc response package`,
        additionalProperties: false,
        properties: [],
      };
      this._jsonSchemaParser.registerCustomTypeManually(jsonRpcResponseClassName, this._jsonRpcResponseClass);
    }

    resultType.extendedBy = this._jsonRpcResponseClass;

    resultType.properties.push({
      name: 'result',
      type: resultParameterType.type,
      owner: resultType,
    });

    return {
      output: {
        name: contentDescriptor.obj.name,
        description: contentDescriptor.obj.description,
        summary: contentDescriptor.obj.summary,
        deprecated: contentDescriptor.obj.deprecated || false,
        required: contentDescriptor.obj.required || false,
        error: false,
        type: resultType,
        contentType: 'application/json',
        qualifiers: [
          {
            path: ['result'],
            operator: OmniComparisonOperator.DEFINED,
          },
        ],
      },
      type: resultParameterType.type,
    };
  }

  private errorToGenericOutput(parentName: string, error: Dereferenced<ErrorObject>): OmniOutput {

    const isUnknownCode = (error.obj.code === -1234567890);
    if (isUnknownCode && this._unknownError) {
      return this._unknownError;
    } else {
      const errorOutput = this.errorToGenericOutputReal(parentName, error.obj, isUnknownCode);
      if (isUnknownCode) {
        if (!this._unknownError) {
          this._unknownError = errorOutput;
        }

        return this._unknownError;
      } else {
        return errorOutput;
      }
    }
  }

  private errorToGenericOutputReal(parentName: string, error: ErrorObject, isUnknownCode: boolean): OmniOutput {
    const typeName = isUnknownCode
      ? `ErrorUnknown`
      : `${parentName}Error${error.code}`;

    if (!this._jsonRpcErrorResponseClass) {

      const className = 'JsonRpcErrorResponse';

      this._jsonRpcErrorResponseClass = {
        kind: OmniTypeKind.OBJECT,
        name: className,
        description: `Generic class to describe the JsonRpc error response package`,
        additionalProperties: false,
        properties: [],
        debug: `Created by ${this.doc.info.title}`,
      };

      this._jsonSchemaParser.registerCustomTypeManually(className, this._jsonRpcErrorResponseClass);
    }

    if (!this._jsonRpcErrorInstanceClass) {

      const className = 'JsonRpcError'; // TODO: Make it a setting
      this._jsonRpcErrorInstanceClass = {
        kind: OmniTypeKind.OBJECT,
        name: className,
        description: `Generic class to describe the JsonRpc error inside an error response`,
        additionalProperties: false,
        properties: [],
        debug: `Created by ${this.doc.info.title}`,
      };

      this._jsonSchemaParser.registerCustomTypeManually(className, this._jsonRpcErrorInstanceClass);
    }

    const errorType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: typeName,
      accessLevel: OmniAccessLevel.PUBLIC,
      extendedBy: this._jsonRpcErrorResponseClass,
      additionalProperties: false,
      properties: [],
      debug: `Created by ${this.doc.info.title}`,
    };

    OpenRpcParser.addJsonRpcErrorProperties(
      errorType, error, isUnknownCode, this._jsonRpcErrorInstanceClass, this.doc, this._options,
    );

    const qualifiers: OmniPayloadPathQualifier[] = [{
      path: ['error'],
      operator: OmniComparisonOperator.DEFINED,
    }];

    if (!isUnknownCode) {
      qualifiers.push({
        path: ['error', 'code'],
        operator: OmniComparisonOperator.EQUALS,
        value: error.code,
      });
    }

    return {
      name: `error-${isUnknownCode ? 'unknown' : error.code}`,
      deprecated: false,
      required: false,
      error: true,
      type: errorType,
      contentType: 'application/json',
      qualifiers: qualifiers,
    };
  }

  private static addJsonRpcErrorProperties(
    target: OmniObjectType,
    error: ErrorObject,
    isUnknownCode: boolean,
    errorPropertySuperType: OmniObjectType,
    doc: OpenrpcDocument,
    options: RealOptions<OpenRpcParserOptions>,
  ): void {

    if (options.jsonRpcPropertyName) {

      const hasConstantVersion = (options.jsonRpcVersion || '').length > 0;
      const responseJsonRpcPropertyType: OmniPrimitiveType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.STRING,
        nullable: false,
      };

      if (hasConstantVersion) {
        responseJsonRpcPropertyType.value = options.jsonRpcVersion;
        responseJsonRpcPropertyType.literal = true;
      }

      target.properties.push({
        name: options.jsonRpcPropertyName,
        type: responseJsonRpcPropertyType,
        owner: target,
      });
    }

    const errorPropertyType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: {
        name: target.name,
        suffix: 'Error',
      },
      additionalProperties: false,
      properties: [],
      debug: `Created by ${doc.info.title}`,
      extendedBy: errorPropertySuperType,
    };

    let codeType: OmniPrimitiveType;
    if (isUnknownCode) {
      codeType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.INTEGER,
        nullable: true,
        value: -1,
        literal: false,
      };
    } else {
      codeType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.INTEGER,
        nullable: false,
        value: error.code,
        literal: true,
      };
    }

    const messageType: OmniPrimitiveType = {
      kind: OmniTypeKind.PRIMITIVE,
      value: error.message,
      literal: false,
      primitiveKind: OmniPrimitiveKind.STRING,
    };

    errorPropertyType.properties.push({
      name: 'code',
      type: codeType,
      owner: errorPropertyType,
    });
    errorPropertyType.properties.push({
      name: 'message',
      type: messageType,
      owner: errorPropertyType,
    });

    if (error.data || !options.jsonRpcErrorDataSchema) {
      // TODO: Check if "data" is a schema object and then create a type, instead of making it an unknown constant?
      errorPropertyType.properties.push({
        name: options.jsonRpcErrorPropertyName,
        type: options.jsonRpcErrorDataSchema || {
          kind: OmniTypeKind.UNKNOWN,
          valueDefault: error.data,
        },
        owner: errorPropertyType,
      });
    } else {
      errorPropertyType.properties.push({
        name: options.jsonRpcErrorPropertyName,
        type: options.jsonRpcErrorDataSchema,
        owner: errorPropertyType,
      });
    }

    if (options.jsonRpcErrorNameIncluded) {

      const nameType: OmniPrimitiveType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.STRING,
        value: 'JSONRPCError',
        literal: true,
      };

      errorPropertyType.properties.push({
        name: 'name',
        type: nameType,
        owner: errorPropertyType,
      });
    }

    const errorProperty: OmniProperty = {
      name: 'error',
      type: errorPropertyType,
      owner: target,
      required: true,
    };

    target.properties.push(errorProperty);

    target.properties.push({
      name: 'result',
      type: {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.NULL,
        nullable: true,
      },
      owner: target,
    });

    if (options.jsonRpcIdIncluded) {
      target.properties.push({
        name: 'id',
        type: {
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.STRING,
        },
        owner: target,
      });
    }
  }

  private examplePairingToGenericExample(
    valueType: OmniType,
    inputProperties: OmniProperty[],
    example: Dereferenced<ExamplePairingObject>,
  ): OmniExamplePairing {

    const params = example.obj.params.map((paramOrRef, idx) => {
      const param = this._deref.get(paramOrRef, example.root);
      return this.exampleParamToGenericExampleParam(inputProperties, param, idx);
    });

    return <OmniExamplePairing>{
      name: example.obj.name,
      description: example.obj.description,
      summary: example.obj['summary'] as string | undefined, // 'summary' does not exist in the OpenRPC object, but does in spec.
      params: params,
      result: this.toOmniExampleResultFromExampleObject(valueType, this._deref.get(example.obj.result, example.root)),
    };
  }

  private exampleParamToGenericExampleParam(
    inputProperties: OmniProperty[],
    param: Dereferenced<ExampleObject>,
    paramIndex: number,
  ): OmniExampleParam {

    // If the name of the example param is the same as the property name, it will match here.
    let property = inputProperties.find(it => it.name == param.obj.name);
    if (!property) {

      // But most of the time, the example param is actually just in the same index as the request params.
      // NOTE: This is actually *how the standard works* -- but we try to be nice.
      property = inputProperties[paramIndex];
    }

    let valueType: OmniType;
    if (property) {
      valueType = property.type;
    } else {
      valueType = <OmniUnknownType>{kind: OmniTypeKind.UNKNOWN};
    }

    return {
      name: param.obj.name,
      property: property,
      description: param.obj.description,
      summary: param.obj.summary,
      type: valueType,
      value: param.obj.value,
    };
  }

  private toOmniExampleResultFromExampleObject(valueType: OmniType, example: Dereferenced<ExampleObject>): OmniExampleResult {

    if (example.obj['externalValue']) {
      // This is part of the specification, but not part of the OpenRPC interface.
    }

    return {
      name: example.obj.name,
      description: example.obj.description,
      summary: example.obj.summary,
      value: example.obj.value,
      type: valueType,
    };
  }

  toOmniExternalDocumentationFromExternalDocumentationObject(documentation: ExternalDocumentationObject): OmniExternalDocumentation {
    return <OmniExternalDocumentation>{
      url: documentation.url,
      description: documentation.description,
    };
  }

  toOmniServerFromServerObject(server: ServerObject): OmniServer {
    return <OmniServer>{
      name: server.name,
      description: server.description,
      summary: server.summary,
      url: server.url,
      variables: new Map<string, unknown>(Object.entries((server.variables || {}))),
    };
  }

  private toOmniPropertyFromContentDescriptor(owner: OmniPropertyOwner, descriptor: Dereferenced<ContentDescriptorObject>): OmniProperty {

    const propertyType = this.toOmniTypeFromContentDescriptor(descriptor);

    return {
      name: descriptor.obj.name,
      description: descriptor.obj.description,
      summary: descriptor.obj.summary,
      deprecated: descriptor.obj.deprecated || false,
      required: descriptor.obj.required || false,
      type: propertyType.type,
      owner: owner,
    };
  }

  private toTypeAndPropertiesFromMethod(method: Dereferenced<MethodObject>): TypeAndProperties {

    let requestParamsType: OmniPropertyOwner;
    if (method.obj.paramStructure == 'by-position') {
      // The params is an array values, and not a map nor properties.
      requestParamsType = <OmniArrayPropertiesByPositionType>{
        // name: `${method.obj.name}RequestParams`,
        kind: OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION,
      };

      requestParamsType.properties = method.obj.params.map(it => {
        return this.toOmniPropertyFromContentDescriptor(requestParamsType, this._deref.get(it, method.root));
      });

      requestParamsType.commonDenominator = OmniUtil.getCommonDenominator(
        OMNI_GENERIC_FEATURES,
        ...requestParamsType.properties.map(it => it.type)
      )?.type;

    } else {

      const objectRequestParamsType: OmniObjectType = {
        kind: OmniTypeKind.OBJECT,
        name: `${method.obj.name}RequestParams`,
        properties: [],
        additionalProperties: false,
      };

      requestParamsType = objectRequestParamsType;

      const properties = method.obj.params.map(it => {
        return this.toOmniPropertyFromContentDescriptor(requestParamsType, this._deref.get(it, method.root));
      });

      if (properties.length > 0) {
        requestParamsType.properties = properties;
      }

      if (!this._requestParamsClass) {
        this._requestParamsClass = {
          kind: OmniTypeKind.OBJECT,
          name: 'JsonRpcRequestParams', // TODO: Make it a setting
          description: `Generic class to describe the JsonRpc request params`,
          additionalProperties: false,
          properties: [],
        };
      }

      requestParamsType.extendedBy = this._requestParamsClass;
    }

    const objectRequestType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: `${method.obj.name}Request`,
      title: method.obj.name,
      properties: [],
      additionalProperties: false,
      description: method.obj.description,
      summary: method.obj.summary,
    };

    // const requestType = objectRequestType;

    objectRequestType.properties = [
      {
        name: 'params',
        type: requestParamsType,
        owner: objectRequestType,
      },
    ];

    OpenRpcParser.addJsonRpcRequestProperties(objectRequestType, method.obj, this._options);

    if (!this._jsonRpcRequestClass) {

      const className = 'JsonRpcRequest'; // TODO: Make it a setting
      this._jsonRpcRequestClass = {
        kind: OmniTypeKind.OBJECT,
        name: className,
        description: `Generic class to describe the JsonRpc request package`,
        additionalProperties: false,
        properties: [],
      };
      this._jsonSchemaParser.registerCustomTypeManually(className, this._jsonRpcRequestClass);
    }

    objectRequestType.extendedBy = this._jsonRpcRequestClass;

    return {
      type: objectRequestType,
      properties: requestParamsType.properties,
    };
  }

  private static addJsonRpcRequestProperties(
    targetObject: OmniObjectType,
    method: MethodObject,
    options: RealOptions<JsonRpcParserOptions & ParserOptions>,
  ): void {

    // TODO: This should be moved to the abstract parent class somehow, then sent down through constructor
    //        Maybe this can be done automatically through GenericOmniModelTransformer?
    //        Or can we do this in some other way? Maybe have valueConstant be string OR callback
    //        Then if callback, it takes the method object, and is put inside the constructor without a given parameter?
    const requestMethodType: OmniPrimitiveType = {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.STRING,
      value: method.name,
      literal: true,
      nullable: false,
    };

    if (options.jsonRpcPropertyName && !options.trustedClients) {

      const hasConstantVersion = (options.jsonRpcVersion || '').length > 0;
      const requestJsonRpcType: OmniPrimitiveType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.STRING,
        nullable: true,
      };

      if (hasConstantVersion) {
        requestJsonRpcType.value = options.jsonRpcVersion;
        requestJsonRpcType.literal = false;
      }

      targetObject.properties.push({
        name: options.jsonRpcPropertyName,
        type: requestJsonRpcType,
        required: true,
        owner: targetObject,
      });
    }

    targetObject.properties.push({
      name: 'method',
      type: requestMethodType,
      required: true,
      readOnly: true,
      owner: targetObject,
    });

    if (options.jsonRpcIdIncluded) {

      let requestIdType: OmniPrimitiveType;
      if (options.trustedClients) {
        requestIdType = {
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.STRING,
          nullable: false,
        };
      } else {
        requestIdType = {
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.STRING,
          nullable: true,
        };
      }

      targetObject.properties.push({
        name: 'id',
        type: requestIdType,
        required: true,
        owner: targetObject,
      });
    }
  }

  private static addJsonRpcResponseProperties(
    target: OmniObjectType,
    _method: MethodObject,
    options: RealOptions<OpenRpcParserOptions>,
  ): void {

    if (options.jsonRpcPropertyName) {

      const hasConstantVersion = (options.jsonRpcVersion || '').length > 0;
      const responseJsonRpcPropertyType: OmniPrimitiveType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.STRING,
        nullable: false,
      };

      if (hasConstantVersion) {
        responseJsonRpcPropertyType.value = options.jsonRpcVersion;
        responseJsonRpcPropertyType.literal = true;
      }

      target.properties.push({
        name: options.jsonRpcPropertyName,
        type: responseJsonRpcPropertyType,
        owner: target,
        readOnly: true,
      });
    }

    target.properties.push({
      name: 'error',
      type: {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.NULL,
        nullable: true,
      },
      owner: target,
    });

    if (options.jsonRpcIdIncluded) {
      target.properties.push({
        name: 'id',
        type: {
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.STRING,
        },
        owner: target,
      });
    }
  }

  private toOmniLinkFromDocMethods(endpoint: OmniEndpoint, endpoints: OmniEndpoint[]): OmniLink[] {

    const continuations: OmniLink[] = [];
    for (const methodOrRef of this.doc.methods) {

      // TODO: This is probably wrong! The reference can exist in another file; in the file that contains the endpoint
      const method = this._deref.get(methodOrRef, this._deref.getFirstRoot());

      for (const linkOrRef of (method.obj.links || [])) {
        const link = this._deref.get(linkOrRef, this._deref.getFirstRoot());

        try {
          continuations.push(this.toOmniLinkFromLinkObject(endpoint, endpoints, link.obj, link.hash));
        } catch (ex) {
          const errorMessage = `Could not build link for ${endpoint.name}: ${ex instanceof Error ? ex.message : ''}`;
          if (!this._preferablyUniqueErrorLogs.has(errorMessage)) {
            this._preferablyUniqueErrorLogs.add(errorMessage);
            logger.error(errorMessage);
          }
        }
      }
    }

    return continuations;
  }

  private getTargetEndpoint(name: string, endpoints: OmniEndpoint[]): OmniEndpoint {
    let targetEndpoint = endpoints.find(it => it.name == name);
    if (!targetEndpoint) {
      const options = endpoints.map(it => it.name);
      const choice = name;

      // TODO: Try converting both into PascalCase and compare
      // TODO: Need to mark as "incorrect" somehow, so the documentation can know the Spec is invalid!
      if (this._options.relaxedLookup) {
        const pascalName = Case.pascal(name);
        targetEndpoint = endpoints.find(it => Case.pascal(it.name) == pascalName);
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

  private toOmniLinkFromLinkObject(sourceEndpoint: OmniEndpoint, endpoints: OmniEndpoint[], link: LinkObject, refName?: string): OmniLink {

    const targetEndpoint = this.getTargetEndpoint(link.method || sourceEndpoint.name, endpoints);
    const paramNames: string[] = Object.keys(link.params as object);

    // The request type is always a class type, since it is created as such by us.
    const requestClass = targetEndpoint.request.type as OmniObjectType;
    const requestParamsParameter = requestClass.properties?.find(it => it.name == 'params');
    if (!requestParamsParameter) {
      throw new Error(`The target request type must be Class and have a 'params' property`);
    }

    const requestResultClass = requestParamsParameter.type as OmniObjectType;

    const mappings: OmniLinkMapping[] = [];
    for (const linkParamName of paramNames) {

      const requestResultParamParameter = requestResultClass.properties?.find(prop => prop.name == linkParamName);

      if (requestResultParamParameter) {

        const sourceParameter: OmniLinkSourceParameter = this.toOmniLinkSourceParameterFromLinkObject(
          // The first response is the Result, not Error or otherwise.
          sourceEndpoint.responses[0].type,
          sourceEndpoint.request.type,
          link,
          linkParamName,
        );

        const targetParameter: OmniLinkTargetParameter = {
          propertyPath: [
            requestParamsParameter,
            requestResultParamParameter,
          ],
        };

        mappings.push({
          source: sourceParameter,
          target: targetParameter,
        });
      } else {
        logger.warn(`Could not find property '${linkParamName}' in '${OmniUtil.describe(requestResultClass)}'`);
      }
    }

    return <OmniLink>{
      name: link.name || refName,
      mappings: mappings,
      description: link.description,
      summary: link.summary,
    };
  }

  private toOmniLinkSourceParameterFromLinkObject(
    primaryType: OmniType,
    secondaryType: OmniType,
    link: LinkObject,
    linkParamName: string,
  ): OmniLinkSourceParameter {

    const params = link.params as Record<string, unknown>;
    const value = params[linkParamName];
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
            const primaryName = OmniUtil.describe(primaryType);
            const secondaryName = OmniUtil.describe(secondaryType);
            throw new Error(`There is no property path '${pathString}' in '${primaryName}' nor '${secondaryName}'`);
          }
        }

        return {
          propertyPath: propertyPath,
        };
      }
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      constantValue: value,
    };
  }

  private getPropertyPath(type: OmniType, pathParts: string[]): OmniProperty[] {
    const propertyPath: OmniProperty[] = [];
    let pointer = type;
    for (let i = 0; i < pathParts.length; i++) {
      if (pointer.kind == OmniTypeKind.OBJECT) {

        const property = pointer.properties?.find(it => it.name == pathParts[i]);
        if (property) {
          propertyPath.push(property);
          pointer = property.type;
        } else {
          return propertyPath;
        }
      } else if (pointer.kind == OmniTypeKind.ARRAY) {

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
        throw new Error(`Do not know how to handle '${OmniUtil.describe(type)}' in property path '${pathParts.join('.')}'`);
      }
    }

    return propertyPath;
  }

  getClosest(options: string[], choice: string | undefined): Rating {

    if (!choice) {
      return {
        rating: 0,
        target: '',
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
    return stringSimilarity.findBestMatch(choice, options).bestMatch;
  }
}
