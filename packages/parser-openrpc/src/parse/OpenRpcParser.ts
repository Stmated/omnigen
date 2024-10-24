import {
  Direction,
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
  OmniItemKind,
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
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyOwner,
  OmniServer,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  OptionsSource,
  Parser,
  ParserBootstrap,
  ParserBootstrapFactory,
  ParserOptions,
  SchemaSource,
  TypeName,
  UnknownKind,
} from '@omnigen/api';
import {Case, Naming, OmniUtil, ToDefined} from '@omnigen/core';
import {parseOpenRPCDocument} from '@open-rpc/schema-utils-js';
import {
  ContactObject,
  ContentDescriptorObject,
  ContentDescriptorOrReference,
  ErrorObject,
  ExampleObject,
  ExamplePairingObject,
  ExternalDocumentationObject,
  LicenseObject,
  LinkObject,
  MethodObject,
  MethodObjectErrors,
  MethodObjectResult,
  MethodOrReference,
  OpenrpcDocument,
  ServerObject,
} from '@open-rpc/meta-schema';
import * as stringSimilarity from 'string-similarity';
import {Rating} from 'string-similarity';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonRpcParserOptions, OpenRpcOptions, OpenRpcVersion} from '../options';
import {
  ApplyIdJsonSchemaTransformerFactory,
  ExternalDocumentsFinder,
  JSONSchema9,
  JSONSchema9Definition,
  JsonSchemaParser,
  RefResolver,
  SchemaToTypeResult,
  SimplifyJsonSchemaTransformerFactory,
} from '@omnigen/parser-jsonschema';
import {DocumentStore, JsonPathFetcher, ObjectReducer} from '@omnigen/core-json';
import {JsonExpander} from '@omnigen-org/json-expander';
import {z} from 'zod';
import {ZodArguments} from '@omnigen/core-plugin';
import {OpenAPIV3_1 as OpenApi} from 'openapi-types';

const logger = LoggerFactory.create(import.meta.url);

const UNKNOWN_ERROR_CODE = -1234567890;

type OutputAndType = { output: OmniOutput; type: OmniType };
type TypeAndProperties = { type: OmniType; properties: OmniProperty[] | undefined };

export class OpenRpcParserBootstrapFactory implements ParserBootstrapFactory<JsonRpcParserOptions & ParserOptions> {

  async createParserBootstrap(schemaSource: SchemaSource, docStore?: DocumentStore): Promise<ParserBootstrap<JsonRpcParserOptions & ParserOptions>> {

    // TODO: Write own models for OpenRPC -- the one that is available as a package does for example not have ExampleObject#externalValue

    if (!docStore) {
      docStore = new DocumentStore();
    }

    const schemaObject = schemaSource.asObject<OpenrpcDocument>();

    const expander = new JsonExpander(uri => JsonPathFetcher.get(uri, docStore));
    expander.expand(schemaObject, schemaSource.getAbsolutePath());

    const document = await parseOpenRPCDocument(schemaObject, {
      dereference: false,
    });

    const absolutePath = schemaSource.getAbsolutePath();
    if (!absolutePath) {
      throw new Error(`The schema file must have a path, to able to dereference documents`);
    }

    // TODO: Completely wrong. Needs to be redone so that we have full control over the OpenRPC and its JsonSchema parts, and they can coexist naturally.
    //        Need to make it so that we can share functionality between the two formats, and visit the whole document properly between borders
    const applyIdTransformer = new ApplyIdJsonSchemaTransformerFactory();
    const transformers = [
      applyIdTransformer.create(),
      new SimplifyJsonSchemaTransformerFactory().create(),
    ];

    // TODO: Make the visitor able to handle OpenRpc documents as well, rethink how we build the transforms -- we should give a visitor to decorate with overriding things

    const transform = (doc: JSONSchema9) => {
      for (const transformer of transformers) {
        const transformed = transformer.visit(doc, transformer);
        if (transformed && typeof transformed === 'object') {
          doc = transformed;
        }
      }

      return doc;
    };

    // TODO: Need to create a new ApplyIdSchemaTransformer for OpenRpc, and only re-use the JsonSchema one where applicable

    const documentFinder = new ExternalDocumentsFinder(absolutePath, document, docStore);
    const refResolver = await (documentFinder.create());

    for (const doc of documentFinder.documents) {

      // TODO: Could be wrong? Or are the JSONSchema auto-migration always true and complete? Is simple casting always true?
      transform(doc as JSONSchema9);

      // TODO: This whole thing needs to be done much easier and faster. It's a mess.
      const walker = new ObjectReducer(doc);
      walker.walk((v, path, registerOnPop) => {

        // There are potential JsonSchemas in these locations:
        // contentDescriptors -> [key] -> schema
        // methods -> [index] -> result -> schema
        // methods -> [index] -> params -> [index] -> schema

        // And we need to add information about the current path if we encounter:
        // methods -> [index]
        // params -> [index]

        // And also the more uncommon
        // components -> methods -> [key] -> result
        // components -> methods -> [key] -> params -> [key]

        if (path.length > 0) {

          const edgePath = path[path.length - 1];

          if (path.length >= 2) {
            if (path[path.length - 2] == 'methods' && typeof edgePath == 'number') {

              // We are walking into a method. Need name for JsonSchema $id context.
              const method = v as MethodOrReference;
              if ('name' in method) {
                applyIdTransformer.pushPath(method.name);
                registerOnPop(() => applyIdTransformer.popPath());
              }
            }

            if (path[path.length - 2] == 'params' && typeof edgePath == 'number') {

              // We are walking into a param. Need name for JsonSchema $id context.
              const param = v as ContentDescriptorOrReference;
              if ('name' in param) {
                applyIdTransformer.pushPath(param.name);
                registerOnPop(() => applyIdTransformer.popPath());
              }
            }
          }

          if (path.length >= 3) {
            if (path[path.length - 3] == 'methods' && typeof path[path.length - 2] == 'number' && path[path.length - 1] == 'result') {

              // We are walking into a result. Need name for JsonSchema $id context.
              const result = v as MethodObjectResult;
              if ('name' in result) {
                applyIdTransformer.pushPath(result.name);
                registerOnPop(() => applyIdTransformer.popPath());
              }
            }

            if (path[path.length - 3] == 'components' && path[path.length - 2] == 'methods') {

              applyIdTransformer.pushPath(String(path[path.length - 1]));
              registerOnPop(() => applyIdTransformer.popPath());
            }

            if (path[path.length - 3] == 'methods' && typeof path[path.length - 2] == 'string' && path[path.length - 1] == 'result') {

              const result = v as MethodObjectResult;
              if ('name' in result) {
                applyIdTransformer.pushPath(result.name);
                registerOnPop(() => applyIdTransformer.popPath());
              }
            }

            if (path[path.length - 2] == 'contentDescriptors' && typeof path[path.length - 1] == 'string') {

              const result = v as ContentDescriptorObject;
              if ('name' in result) {
                applyIdTransformer.pushPath(String(path[path.length - 1]));
                applyIdTransformer.pushPath(result.name);
                registerOnPop(() => applyIdTransformer.popPath());
                registerOnPop(() => applyIdTransformer.popPath());
              }
            }
          }

          if (edgePath === 'schema') {
            transform(v as JSONSchema9);
          }

          if (v && typeof v == 'object' && path.length >= 3 && path[path.length - 3] == 'components' && path[path.length - 2] == 'schemas' && typeof edgePath == 'string') {
            applyIdTransformer.pushPath({name: edgePath});
            transform(v as JSONSchema9);
            registerOnPop(() => applyIdTransformer.popPath());
          }
        }

        return v;
      });
    }

    return new OpenRpcParserBootstrap(document, refResolver, docStore);
  }
}

export class OpenRpcParserBootstrap implements ParserBootstrap<JsonRpcParserOptions & ParserOptions>, OptionsSource {

  private readonly _doc: OpenrpcDocument;
  private readonly _deref: RefResolver;
  private readonly _docStore: DocumentStore;

  constructor(doc: OpenrpcDocument, deref: RefResolver, docStore: DocumentStore) {
    this._doc = doc;
    this._deref = deref;
    this._docStore = docStore;
  }

  getIncomingOptions(): z.infer<typeof ZodArguments> | undefined {

    const doc = this._doc;
    const documentOptions: Partial<JsonRpcParserOptions & OpenRpcOptions> = {
      openRpcVersion: this.toSimplifiedOpenRpcVersion(doc.openrpc),
    };

    return {
      ...ZodArguments.parse(doc['x-omnigen'] || {}),
      ...documentOptions,
    };
  }

  private toSimplifiedOpenRpcVersion(version?: string): OpenRpcVersion {
    if (!version) {
      return '1.2';
    }

    if (version.startsWith('1.0')) {
      return '1.0';
    } else if (version.startsWith('1.1')) {
      return '1.1';
    } else if (version.startsWith('1.2')) {
      return '1.2';
    } else {
      logger.warn(`Unknown OpenRPC version ${version}, will fall back on 1.2`);
      return '1.2';
    }
  }

  createParser(options: JsonRpcParserOptions & ParserOptions): Parser<JsonRpcParserOptions & ParserOptions> {
    return new OpenRpcParser(this._deref, this._doc, options, this._docStore);
  }
}

/**
 * TODO: Remove this class, keep the global variables in the class above
 */
export class OpenRpcParser implements Parser<JsonRpcParserOptions & ParserOptions> {

  static readonly PATTERN_PLACEHOLDER = new RegExp(/^[$]{([^}]+)}$/);
  static readonly PATTERN_PLACEHOLDER_RELAXED = new RegExp(/[$]{([^}]+)}$|^{{([^}]+?)}}$|^[$](.+?)$/);

  private readonly _options: JsonRpcParserOptions & ParserOptions;

  private _unknownError?: OmniOutput;

  private readonly _preferablyUniqueErrorLogs = new Set<string>();

  private _jsonRpcRequestClass?: OmniObjectType;
  private _jsonRpcCallbackRequestClass?: OmniObjectType;

  private _jsonRpcResponseClass?: OmniObjectType;
  private _jsonRpcErrorResponseClass?: OmniObjectType;
  private _jsonRpcErrorInstanceClass?: OmniObjectType;

  private _requestParamsClass?: OmniObjectType;
  private _callbackParamsClass?: OmniObjectType;

  private readonly _doc: OpenrpcDocument;
  private readonly _refResolver: RefResolver;
  private readonly _docStore: DocumentStore;

  /**
   * TODO: Remove! Should delegate to some central thing which can decide if it can handle the given URI/Object
   */
  private readonly _jsonSchemaParser: JsonSchemaParser<JsonRpcParserOptions & ParserOptions>;

  private get doc(): OpenrpcDocument {
    return this._doc;
  }

  constructor(refResolver: RefResolver, doc: OpenrpcDocument, options: JsonRpcParserOptions & ParserOptions, docStore: DocumentStore) {
    this._doc = doc;
    this._refResolver = refResolver;
    this._options = options;
    this._jsonSchemaParser = new JsonSchemaParser(refResolver, this._options);
    this._docStore = docStore;
  }

  parse(): OmniModelParserResult<JsonRpcParserOptions & ParserOptions> {

    const endpoints = this.doc.methods.map(it => this.toOmniEndpointFromMethod(this._refResolver.resolve(it)));
    const contact = this.doc.info.contact ? this.toOmniContactFromContact(this.doc.info.contact) : undefined;
    const license = this.doc.info.license ? this.toOmniLicenseFromLicense(this.doc.info.license) : undefined;
    const servers = (this.doc.servers || []).map(server => this.toOmniServerFromServerObject(server));
    const docs = this.doc.externalDocs ? [this.toOmniExternalDocumentationFromExternalDocumentationObject(this.doc.externalDocs)] : [];
    const continuations = endpoints.flatMap(it => this.toOmniLinkFromDocMethods(it, endpoints));

    const manualTypes: OmniType[] = [];
    // Now find all the types that were not referenced by a method, but is in the contract.
    // We most likely still want those types to be included.
    if (this.doc.components?.schemas) {
      for (const [key, schema] of Object.entries(this.doc.components.schemas)) {
        const deref = this._refResolver.resolve(schema) as JSONSchema9;

        // Call to get the type from the schema.
        // That way we make sure it's in the type map.
        manualTypes.push(this._jsonSchemaParser.jsonSchemaToType(deref.$id || key, deref).type);
      }
    }

    const model: OmniModel = {
      kind: OmniItemKind.MODEL,
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
      types: manualTypes,
    };

    this._jsonSchemaParser.executePostCleanup(model);

    return {
      model: model,
      options: this._options,
    };
  }

  toOmniLicenseFromLicense(license: LicenseObject): OmniLicense {
    return {
      kind: OmniItemKind.LICENSE,
      name: license.name ?? 'N/A',
      url: license.url,
    };
  }

  toOmniContactFromContact(contact: ContactObject): OmniContact {
    return {
      kind: OmniItemKind.CONTACT,
      name: contact.name,
      url: contact.url,
      email: contact.email,
    };
  }

  toOmniEndpointFromMethod(method: MethodObject): OmniEndpoint {

    if (!method.name) {
      throw new Error(`Encountered Method without a 'name'-property, one must be set to:\n${JSON.stringify(method, undefined, 2)}`);
    }

    const methodNames: TypeName[] = [];

    const methodTitle = ('x-title' in method) ? method['x-title'] : undefined;

    if (methodTitle) {
      methodNames.push(methodTitle);
    }

    methodNames.push(method.name);

    if (method.tags) {
      const tagNames: string[] = [];
      for (const tag of method.tags) {
        const resolved = this._refResolver.resolve(tag);
        const trimmed = (resolved?.name ?? '').trim();
        if (trimmed.length > 0) {
          tagNames.push(trimmed);
        }
      }

      if (tagNames.length > 1) {

        // TODO: This should not map and Pascal-case the tagNames. Instead the `TypeName` should be able to declare that an array is required to be merged.
        //          That way we can delay the formatting of the name until much later
        methodNames.push({
          name: method.name,
          suffix: tagNames.map(it => Case.pascal(it)).join(''),
        });
      }

      for (const tagName of tagNames) {
        methodNames.push({
          name: method.name,
          suffix: Case.pascal(tagName),
        });
      }
    }

    const requestTypeAndProperties = this.toRequestTypeAndPropertiesFromMethod(method, methodNames);
    const resultResponse = this.toOmniOutputFromContentDescriptor(method, this._refResolver.resolve(method.result), methodNames);

    const responses: OmniOutput[] = [];

    // One regular response
    responses.push(resultResponse.output);

    // And then one response for each potential error
    const errorsOrReferences: MethodObjectErrors = method.errors || [];

    // We will always add the generic error classes, since we can never trust that the server will be truthful.
    errorsOrReferences.push({
      code: UNKNOWN_ERROR_CODE,
      message: 'Unknown Error',
    });

    const errorOutputs = errorsOrReferences.map(it => {
      const deref = this._refResolver.resolve(it);
      return this.errorToGenericOutput(Case.pascal(method.name), deref);
    });

    responses.push(...errorOutputs);

    const examples = (method.examples || []).map(it => {
      const deref = this._refResolver.resolve(it);
      return this.examplePairingToGenericExample(resultResponse.type, requestTypeAndProperties.properties || [], deref);
    });

    // TODO: Needs to be implemented, or solved some other way(s)
    if ('x-callbacks' in method) {

      const callbacks = method['x-callbacks'] as ToDefined<OpenApi.ComponentsObject['callbacks']>;

      for (const [eventName, eventOrRef] of Object.entries(callbacks)) {
        const event = this._refResolver.resolve(eventOrRef);
        for (const [callbackUrl, callbackOrRef] of Object.entries(event)) {
          const callback = this._refResolver.resolve(callbackOrRef);
        }
      }
    }

    const isCallback = this.isCallbackMethod(method);

    const uniqueNames = [...new Set<string>(methodNames.map(it => Naming.unwrap(it)))];

    logger.debug(`Done creating method ${method.name} (${uniqueNames.join(' / ')})${isCallback ? ' (Which should be a callback)' : ''}`);

    return {
      kind: OmniItemKind.ENDPOINT,
      name: method.name,
      description: method.description,
      summary: method.summary,
      transports: [{
        kind: OmniItemKind.TRANSPORT_HTTP,
        async: false,
        path: '',
      }],
      request: {
        kind: OmniItemKind.INPUT,
        contentType: 'application/json',
        type: requestTypeAndProperties.type,
      },
      requestQualifiers: [
        {
          kind: OmniItemKind.PAYLOAD_PATH_QUALIFIER,
          path: ['method'],
          operator: OmniComparisonOperator.EQUALS,
          value: method.name,
        },
      ],
      responses: responses,
      deprecated: method.deprecated || false,
      examples: examples,
      externalDocumentations: method.externalDocs
        ? [this.toOmniExternalDocumentationFromExternalDocumentationObject(method.externalDocs)]
        : [],
    };
  }

  private isCallbackMethod(method: MethodObject) {
    return 'x-callback' in method && Boolean(method['x-callback']);
  }

  private toOmniTypeFromContentDescriptor(
    contentDescriptor: ContentDescriptorObject,
  ): SchemaToTypeResult {

    const schema = contentDescriptor.schema as JSONSchema9Definition;
    const resolved = this._refResolver.resolve(schema) as JSONSchema9Definition;
    // const preferredName: TypeName = JsonSchemaParser.getVendorExtension(contentDescriptor, 'title') ?? this._jsonSchemaParser.getPreferredName(schema, resolved, fallbackName);

    const type = this._jsonSchemaParser.jsonSchemaToType(undefined, resolved);

    return {
      type: type.type,
    };
  }

  private toOmniOutputFromContentDescriptor(method: MethodObject, contentDescriptor: ContentDescriptorObject, methodName: TypeName): OutputAndType {

    const responseTypeName: TypeName = {
      name: methodName,
      suffix: 'Response',
    };

    const resultSchema = contentDescriptor.schema as JSONSchema9Definition;
    const resolvedResultSchema = this._refResolver.resolve(resultSchema);

    const resultTypeName: TypeName[] = [];

    const likelyName = this._jsonSchemaParser.getLikelyNames(resultSchema, resolvedResultSchema);
    if (likelyName) {
      resultTypeName.push(likelyName);
    }

    resultTypeName.push(
      contentDescriptor.name,
      {name: responseTypeName, suffix: 'Result'},
      {name: responseTypeName, suffix: 'ResultPayload'},
    );

    const resultType = this._jsonSchemaParser.jsonSchemaToType(resultTypeName, resolvedResultSchema);

    const responseType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: responseTypeName,
      properties: [],
      description: method.description,
      summary: method.summary,
    };

    OpenRpcParser.addJsonRpcResponseProperties(responseType, method, this._options);

    if (!this._jsonRpcResponseClass) {

      const jsonRpcResponseClassName = 'JsonRpcResponse'; // TODO: Make it a setting

      this._jsonRpcResponseClass = {
        kind: OmniTypeKind.OBJECT,
        name: jsonRpcResponseClassName,
        description: `Generic class to describe the JsonRpc response package`,
        properties: [],
      };
      this._jsonSchemaParser.registerCustomTypeManually(jsonRpcResponseClassName, this._jsonRpcResponseClass);
    }

    responseType.extendedBy = this._jsonRpcResponseClass;

    responseType.properties.push({
      kind: OmniItemKind.PROPERTY,
      name: 'result',
      type: resultType.type,
      required: this._options.jsonRpcResultRequired,
    });

    return {
      output: {
        kind: OmniItemKind.OUTPUT,
        name: contentDescriptor.name,
        description: contentDescriptor.description,
        summary: contentDescriptor.summary,
        deprecated: contentDescriptor.deprecated || false,
        required: contentDescriptor.required || false,
        error: false,
        type: responseType,
        contentType: 'application/json',
        qualifiers: [
          {
            kind: OmniItemKind.PAYLOAD_PATH_QUALIFIER,
            path: ['result'],
            operator: OmniComparisonOperator.DEFINED,
          },
        ],
      },
      type: resultType.type,
    };
  }

  private errorToGenericOutput(parentName: string, error: ErrorObject): OmniOutput {

    const isUnknownCode = (error.code === UNKNOWN_ERROR_CODE);
    if (isUnknownCode && this._unknownError) {
      return this._unknownError;
    } else {
      const errorOutput = this.errorToGenericOutputReal(parentName, error, isUnknownCode);
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
      properties: [],
      debug: `Created by ${this.doc.info.title}`,
    };

    this.addJsonRpcErrorProperties(
      errorType, error, isUnknownCode, this._jsonRpcErrorInstanceClass, this.doc, this._options,
    );

    const qualifiers: OmniPayloadPathQualifier[] = [{
      kind: OmniItemKind.PAYLOAD_PATH_QUALIFIER,
      path: ['error'],
      operator: OmniComparisonOperator.DEFINED,
    }];

    if (!isUnknownCode) {
      qualifiers.push({
        kind: OmniItemKind.PAYLOAD_PATH_QUALIFIER,
        path: ['error', 'code'],
        operator: OmniComparisonOperator.EQUALS,
        value: error.code,
      });
    }

    return {
      kind: OmniItemKind.OUTPUT,
      name: `error-${isUnknownCode ? 'unknown' : error.code}`,
      deprecated: false,
      required: false,
      error: true,
      type: errorType,
      contentType: 'application/json',
      qualifiers: qualifiers,
    };
  }

  private addJsonRpcErrorProperties(
    target: OmniObjectType,
    error: ErrorObject,
    isUnknownCode: boolean,
    errorPropertySuperType: OmniObjectType,
    doc: OpenrpcDocument,
    options: JsonRpcParserOptions & ParserOptions,
  ): void {

    if (options.jsonRpcPropertyName) {

      const hasConstantVersion = (options.jsonRpcVersion || '').length > 0;
      const responseJsonRpcPropertyType: OmniPrimitiveType = {
        kind: OmniTypeKind.STRING,
        nullable: false,
      };

      if (hasConstantVersion) {
        responseJsonRpcPropertyType.value = options.jsonRpcVersion;
        responseJsonRpcPropertyType.literal = true;
      }

      target.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: options.jsonRpcPropertyName,
        type: responseJsonRpcPropertyType,
      });
    }

    const errorPropertyType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: {
        name: target.name,
        suffix: 'Error',
      },
      properties: [],
      debug: `Created by ${doc.info.title}`,
      extendedBy: errorPropertySuperType,
    };

    let codeType: OmniPrimitiveType;
    if (isUnknownCode) {
      codeType = {
        kind: OmniTypeKind.INTEGER,
        nullable: true,
        value: -1,
        literal: false,
      };
    } else {
      codeType = {
        kind: OmniTypeKind.INTEGER,
        nullable: false,
        value: error.code,
        literal: true,
      };
    }

    const messageType: OmniPrimitiveType = {
      kind: OmniTypeKind.STRING,
      nullable: true,
      value: error.message,
      literal: false,
    };

    errorPropertyType.properties.push({
      kind: OmniItemKind.PROPERTY,
      name: 'code',
      type: codeType,
    });
    errorPropertyType.properties.push({
      kind: OmniItemKind.PROPERTY,
      name: 'message',
      type: messageType,
    });

    if (error.data) {
      errorPropertyType.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: options.jsonRpcErrorPropertyName,
        type: {
          // TODO: Create a new "const" type, since it's not really unknown since there is a known data structure.
          kind: OmniTypeKind.UNKNOWN,
          unknownKind: UnknownKind.DYNAMIC_NATIVE,
          valueDefault: error.data,
          nullable: false,
        } satisfies OmniUnknownType,
        readOnly: true,
        debug: ['From OpenRpcParser with data'],
      });
    } else if (error.data || !options.jsonRpcErrorDataSchema) {
      errorPropertyType.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: options.jsonRpcErrorPropertyName,
        type: {
          kind: OmniTypeKind.UNKNOWN,
          unknownKind: UnknownKind.DYNAMIC,
          nullable: false,
        } satisfies OmniUnknownType,
        readOnly: true,
        debug: ['From OpenRpcParser with no schema, so unknown'],
      });
    } else {

      const optionsErrorSchema = this.toOmniType(options.jsonRpcErrorDataSchema);
      if (!optionsErrorSchema) {
        throw new Error(`Has a JsonRpc error data schema, but it could not be converted into an omni type`);
      }

      errorPropertyType.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: options.jsonRpcErrorPropertyName,
        type: optionsErrorSchema,
        debug: ['From OpenRpcParser with schema'],
      });
    }

    if (options.jsonRpcErrorNameIncluded) {

      const nameType: OmniPrimitiveType = {
        kind: OmniTypeKind.STRING,
        value: 'JSONRPCError',
        literal: true,
      };

      errorPropertyType.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: 'name',
        type: nameType,
      });
    }

    const errorProperty: OmniProperty = {
      kind: OmniItemKind.PROPERTY,
      name: 'error',
      type: errorPropertyType,
      required: true,
      debug: ['From OpenRpc'],
    };

    target.properties.push(errorProperty);

    target.properties.push({
      kind: OmniItemKind.PROPERTY,
      name: 'result',
      type: {
        kind: OmniTypeKind.NULL,
        nullable: true,
      },
    });

    if (options.jsonRpcIdIncluded) {
      target.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: 'id',
        type: {
          kind: OmniTypeKind.STRING,
          nullable: !options.jsonRpcIdRequired,
        },
      });
    }
  }

  private examplePairingToGenericExample(
    valueType: OmniType,
    inputProperties: OmniProperty[],
    example: ExamplePairingObject,
  ): OmniExamplePairing {

    const params = example.params.map((paramOrRef, idx) => {
      const param = this._refResolver.resolve(paramOrRef);
      return this.exampleParamToGenericExampleParam(inputProperties, param, idx);
    });

    return {
      kind: OmniItemKind.EXAMPLE_PAIRING,
      name: example.name,
      description: example.description,
      summary: example['summary'] as string | undefined, // 'summary' does not exist in the OpenRPC object, but does in spec.
      params: params,
      result: example.result ? this.toOmniExampleResultFromExampleObject(valueType, this._refResolver.resolve(example.result)) : undefined,
    };
  }

  private toOmniType(
    source: OmniType | JsonRpcParserOptions['jsonRpcErrorDataSchema'],
  ): OmniType | undefined {

    if (!source) {
      return source;
    }

    if ('kind' in source) {
      return source;
    }

    // const jsonSchemaParser = new JsonSchemaParser<JSONSchema9, JsonRpcParserOptions & ParserOptions>(refResolver, openrpcParserOptions);
    return this._jsonSchemaParser.transformErrorDataSchemaToOmniType('JsonRpcCustomErrorPayload', source, this._docStore);
  }

  private exampleParamToGenericExampleParam(
    inputProperties: OmniProperty[],
    param: ExampleObject,
    paramIndex: number,
  ): OmniExampleParam {

    // If the name of the example param is the same as the property name, it will match here.
    let property = inputProperties.find(
      it => OmniUtil.isPropertyNameMatching(it.name, param.name),
    );
    if (!property) {

      // But most of the time, the example param is actually just in the same index as the request params.
      // NOTE: This is actually *how the standard works* -- but we try to be nice.
      property = inputProperties[paramIndex];
    }

    let valueType: OmniType;
    if (property) {
      valueType = property.type;
    } else {
      valueType = {kind: OmniTypeKind.UNKNOWN} satisfies OmniUnknownType;
    }

    return {
      kind: OmniItemKind.EXAMPLE_PARAM,
      name: param.name,
      property: property,
      description: param.description,
      summary: param.summary,
      type: valueType,
      value: param.value,
    };
  }

  private toOmniExampleResultFromExampleObject(valueType: OmniType, example: ExampleObject): OmniExampleResult {

    if (example['externalValue']) {
      // This is part of the specification, but not part of the OpenRPC interface.
    }

    return {
      kind: OmniItemKind.EXAMPLE_RESULT,
      name: example.name,
      description: example.description,
      summary: example.summary,
      value: example.value,
      type: valueType,
    };
  }

  toOmniExternalDocumentationFromExternalDocumentationObject(documentation: ExternalDocumentationObject): OmniExternalDocumentation {
    return {
      kind: OmniItemKind.EXTERNAL_DOCUMENTATION,
      url: documentation.url,
      description: documentation.description,
    };
  }

  toOmniServerFromServerObject(server: ServerObject): OmniServer {
    return {
      kind: OmniItemKind.SERVER,
      name: server.name,
      description: server.description,
      summary: server.summary,
      url: server.url,
      variables: new Map<string, unknown>(Object.entries((server.variables || {}))),
    };
  }

  private toOmniPropertyFromContentDescriptor(owner: OmniPropertyOwner, descriptor: ContentDescriptorObject): OmniProperty {

    const propertyType = this.toOmniTypeFromContentDescriptor(descriptor);

    const property: OmniProperty = {
      kind: OmniItemKind.PROPERTY,
      name: JsonSchemaParser.getPreferredPropertyName(descriptor.schema as JSONSchema9Definition, descriptor.name, this._options),
      description: descriptor.description,
      summary: descriptor.summary,
      deprecated: descriptor.deprecated ?? false,
      required: descriptor.required ?? false,
      type: propertyType.type,
      debug: [`From OpenRpc ContentDescriptor ${descriptor.name}`],
    };

    JsonSchemaParser.updateProperty(descriptor.schema as JSONSchema9, undefined, property, descriptor.name);

    return property;
  }

  private toRequestTypeAndPropertiesFromMethod(method: MethodObject, methodName: TypeName): TypeAndProperties {

    const isCallback = this.isCallbackMethod(method);
    const requestName: TypeName = {
      name: methodName,
      suffix: (isCallback ? this._options.jsonRpcCallbackMethodTypeSuffix : this._options.jsonRpcRequestMethodTypeSuffix) ?? 'Request',
    };

    const requestParamsType = this.toRequestPropertyFromParameters(method, requestName);

    const objectRequestType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: requestName,
      title: method.name,
      properties: [],
      description: method.description,
      summary: method.summary,
    };

    objectRequestType.properties = [
      {
        kind: OmniItemKind.PROPERTY,
        name: 'params',
        type: requestParamsType,
      },
    ];

    OpenRpcParser.addJsonRpcRequestProperties(objectRequestType, method, this._options);

    if (isCallback) {

      if (!this._jsonRpcCallbackRequestClass) {

        const className = this._options.jsonRpcCallbackTypeName;
        this._jsonRpcCallbackRequestClass = {
          kind: OmniTypeKind.OBJECT,
          name: className,
          description: `Generic class to describe the JsonRpc callback package`,
          properties: [],
        };
        this._jsonSchemaParser.registerCustomTypeManually(className, this._jsonRpcCallbackRequestClass);
      }

      objectRequestType.direction = Direction.IN;
      objectRequestType.extendedBy = this._jsonRpcCallbackRequestClass;

    } else {

      if (!this._jsonRpcRequestClass) {

        const className = this._options.jsonRpcRequestTypeName;
        this._jsonRpcRequestClass = {
          kind: OmniTypeKind.OBJECT,
          name: className,
          description: `Generic class to describe the JsonRpc request package`,
          properties: [],
        };
        this._jsonSchemaParser.registerCustomTypeManually(className, this._jsonRpcRequestClass);
      }

      objectRequestType.direction = Direction.OUT;
      objectRequestType.extendedBy = this._jsonRpcRequestClass;
    }

    return {
      type: objectRequestType,
      properties: requestParamsType.properties,
    };
  }

  private toRequestPropertyFromParameters(
    method: MethodObject,
    requestTypeName: TypeName,
  ) {

    let requestParamsType: OmniPropertyOwner;
    if (method.paramStructure == 'by-position') {
      // The params is an array values, and not a map nor properties.
      requestParamsType = {
        kind: OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION,
        properties: [],
      } satisfies OmniArrayPropertiesByPositionType;

      requestParamsType.properties = method.params.map(it => {
        return this.toOmniPropertyFromContentDescriptor(requestParamsType, this._refResolver.resolve(it));
      });

      requestParamsType.commonDenominator = OmniUtil.getCommonDenominator(
        OMNI_GENERIC_FEATURES,
        requestParamsType.properties.map(it => it.type),
      )?.type;

    } else {

      requestParamsType = {
        kind: OmniTypeKind.OBJECT,
        name: {
          name: requestTypeName,
          suffix: 'Params',
        },
        properties: [],
      } satisfies OmniObjectType;

      const properties = method.params.map(it => {
        try {
          return this.toOmniPropertyFromContentDescriptor(requestParamsType, this._refResolver.resolve(it));
        } catch (ex) {
          throw new Error(`Could not convert from property '${OmniUtil.describe(requestParamsType)}' to OpenRpc Content Descriptor for method '${method.name}'`, {cause: ex});
        }
      });

      if (properties.length > 0) {
        requestParamsType.properties = properties;
      }

      if (this.isCallbackMethod(method)) {

        if (!this._callbackParamsClass) {
          this._callbackParamsClass = {
            kind: OmniTypeKind.OBJECT,
            name: this._options.jsonRpcCallbackParamsTypeName,
            description: `Generic class to describe the JsonRpc callback params`,
            properties: [],
          };
        }

        requestParamsType.extendedBy = this._callbackParamsClass;

      } else {

        if (!this._requestParamsClass) {
          this._requestParamsClass = {
            kind: OmniTypeKind.OBJECT,
            name: this._options.jsonRpcRequestParamsTypeName,
            description: `Generic class to describe the JsonRpc request params`,
            properties: [],
          };
        }

        requestParamsType.extendedBy = this._requestParamsClass;
      }
    }

    return requestParamsType;
  }

  private static addJsonRpcRequestProperties(
    targetObject: OmniObjectType,
    method: MethodObject,
    options: JsonRpcParserOptions & ParserOptions,
  ): void {

    const requestMethodType: OmniPrimitiveType = {
      kind: OmniTypeKind.STRING,
      value: method.name,
      literal: true,
      nullable: false,
    };

    if (options.jsonRpcPropertyName && !options.trustedClients) {

      const hasConstantVersion = (options.jsonRpcVersion || '').length > 0;
      const requestJsonRpcType: OmniPrimitiveType = {
        kind: OmniTypeKind.STRING,
        nullable: true,
      };

      if (hasConstantVersion) {
        requestJsonRpcType.value = options.jsonRpcVersion;

        // If the direction is 'OUT', then we can make it a literal and inline it.
        requestJsonRpcType.literal = (options.direction == Direction.OUT);
      }

      targetObject.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: options.jsonRpcPropertyName,
        type: requestJsonRpcType,
        required: true,
      });
    }

    targetObject.properties.push({
      kind: OmniItemKind.PROPERTY,
      name: 'method',
      type: requestMethodType,
      required: true,
      readOnly: true,
      debug: `Method literal (${method.name}) from OpenRpc Spec`,
    });

    if (options.jsonRpcIdIncluded) {

      const requestIdType: OmniPrimitiveType = {
        kind: OmniTypeKind.STRING,
        nullable: false,
        // nullable: !options.trustedClients || !options.jsonRpcIdRequired,
      };
      // if (options.trustedClients) {
      // requestIdType =
      // } else {
      //   requestIdType = {
      //     kind: OmniTypeKind.STRING,
      //     nullable: true,
      //   };
      // }

      targetObject.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: 'id',
        type: requestIdType,
        required: options.jsonRpcIdRequired && options.trustedClients,
      });
    }
  }

  private static addJsonRpcResponseProperties(
    target: OmniObjectType,
    _method: MethodObject,
    options: JsonRpcParserOptions & ParserOptions,
  ): void {

    if (options.jsonRpcPropertyName) {

      const hasConstantVersion = (options.jsonRpcVersion || '').length > 0;
      const responseJsonRpcPropertyType: OmniPrimitiveType = {
        kind: OmniTypeKind.STRING,
        nullable: false,
      };

      if (hasConstantVersion) {
        responseJsonRpcPropertyType.value = options.jsonRpcVersion;
        responseJsonRpcPropertyType.literal = true;
      }

      target.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: options.jsonRpcPropertyName,
        type: responseJsonRpcPropertyType,
        readOnly: true,
      });
    }

    target.properties.push({
      kind: OmniItemKind.PROPERTY,
      name: 'error',
      type: {
        kind: OmniTypeKind.NULL,
        nullable: true,
      },
    });

    if (options.jsonRpcIdIncluded) {
      target.properties.push({
        kind: OmniItemKind.PROPERTY,
        name: 'id',
        type: {
          kind: OmniTypeKind.STRING,
          nullable: !options.jsonRpcIdRequired,
        },
      });
    }
  }

  private toOmniLinkFromDocMethods(endpoint: OmniEndpoint, endpoints: OmniEndpoint[]): OmniLink[] {

    const continuations: OmniLink[] = [];
    for (const methodOrRef of this.doc.methods) {

      // TODO: This is probably wrong! The reference can exist in another file; in the file that contains the endpoint
      const method = this._refResolver.resolve(methodOrRef);

      for (const linkOrRef of (method.links || [])) {
        const link = this._refResolver.resolve(linkOrRef);

        try {
          continuations.push(this.toOmniLinkFromLinkObject(endpoint, endpoints, link, link.hash));
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
    const requestParamsParameter = requestClass.properties?.find(
      it => OmniUtil.isPropertyNameEqual(it.name, 'params'),
    );
    if (!requestParamsParameter) {
      throw new Error(`The target request type must be Class and have a 'params' property`);
    }

    const requestResultClass = requestParamsParameter.type as OmniObjectType;

    const mappings: OmniLinkMapping[] = [];
    for (const linkParamName of paramNames) {

      const requestResultParamParameter = requestResultClass.properties?.find(
        prop => OmniUtil.isPropertyNameEqual(prop.name, linkParamName),
      );

      if (requestResultParamParameter) {

        const sourceParameter: OmniLinkSourceParameter = this.toOmniLinkSourceParameterFromLinkObject(
          // The first response is the Result, not Error or otherwise.
          sourceEndpoint.responses[0].type,
          sourceEndpoint.request.type,
          link,
          linkParamName,
        );

        const targetParameter: OmniLinkTargetParameter = {
          kind: OmniItemKind.LINK_TARGET_PARAMETER,
          propertyPath: [
            requestParamsParameter,
            requestResultParamParameter,
          ],
        };

        mappings.push({
          kind: OmniItemKind.LINK_MAPPING,
          source: sourceParameter,
          target: targetParameter,
        });
      } else {
        logger.warn(`Could not find property '${linkParamName}' in '${OmniUtil.describe(requestResultClass)}'`);
      }
    }

    return {
      kind: OmniItemKind.LINK,
      // name: link.name || refName,
      mappings: mappings,
      description: link.description ?? link.name ?? refName,
      summary: link.summary,
    } satisfies OmniLink;
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
          kind: OmniItemKind.LINK_SOURCE_PARAMETER,
          propertyPath: propertyPath,
        };
      }
    }

    return {
      kind: OmniItemKind.LINK_SOURCE_PARAMETER,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      constantValue: value,
    };
  }

  private getPropertyPath(type: OmniType, pathParts: string[]): OmniProperty[] {
    const propertyPath: OmniProperty[] = [];
    let pointer = type;
    for (let i = 0; i < pathParts.length; i++) {
      if (pointer.kind == OmniTypeKind.OBJECT) {

        const property = pointer.properties?.find(
          it => OmniUtil.isPropertyNameMatching(it.name, pathParts[i]),
        );
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

    return stringSimilarity.findBestMatch(choice, options).bestMatch;
  }
}
