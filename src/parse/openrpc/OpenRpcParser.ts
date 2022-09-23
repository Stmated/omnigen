import {AbstractParser} from '@parse/AbstractParser';

import {
  AllowedEnumTsTypes,
  CompositionKind,
  JSONSchema7Items,
  OmniAccessLevel,
  OmniArrayPropertiesByPositionType,
  OmniArrayTypes,
  OmniArrayTypesByPositionType,
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
  OmniObjectType,
  OmniOutput,
  OmniPayloadPathQualifier,
  OmniPrimitiveConstantValue,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyOwner,
  OmniServer,
  OmniSubTypeHint,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  PrimitiveNullableKind,
  SchemaFile,
  TypeName,
} from '@parse';
import {parseOpenRPCDocument} from '@open-rpc/schema-utils-js';
import {
  ContactObject,
  ContentDescriptorObject,
  ErrorObject,
  ExampleObject,
  ExamplePairingObject,
  ExternalDocumentationObject,
  JSONSchema,
  JSONSchemaObject,
  LicenseObject,
  LinkObject,
  MethodObject,
  MethodObjectErrors,
  OpenrpcDocument,
  ServerObject,
} from '@open-rpc/meta-schema';
import {JSONSchema7, JSONSchema7Definition, JSONSchema7Type} from 'json-schema';
import {camelCase, pascalCase} from 'change-case';
import {JavaUtil} from '@java';
import * as stringSimilarity from 'string-similarity';
import {Rating} from 'string-similarity';
import {Dereferenced, Dereferencer, LoggerFactory} from '@util';
import {DEFAULT_PARSER_OPTIONS, IParserOptions, IRequiredParserOptions} from '@parse/IParserOptions';
import {CompositionUtil} from '@parse/CompositionUtil';
import {Naming} from '@parse/Naming';
import * as path from 'path';
import {JsonObject} from 'json-pointer';
import {OpenApiJSONSchema7, OpenApiJSONSchema7Definition} from '@parse/openrpc/OpenApiExtendedJsonSchema';
import {OmniModelUtil} from '@parse/OmniModelUtil';

export const logger = LoggerFactory.create(__filename);

type SchemaToTypeResult = { type: OmniType; canInline: boolean };

type OutputAndType = { output: OmniOutput; type: OmniType };
type TypeAndProperties = { type: OmniType; properties: OmniProperty[] | undefined };

interface PostDiscriminatorMapping {
  type: OmniObjectType;
  schema: Dereferenced<OpenApiJSONSchema7Definition>;
}

export class OpenRpcParser extends AbstractParser {

  async parse(schemaFile: SchemaFile): Promise<OmniModel> {
    const schemaObject = await schemaFile.asObject();
    const document = await parseOpenRPCDocument(schemaObject as OpenrpcDocument, {
      dereference: false,
    });

    const absolutePath = schemaFile.getAbsolutePath();
    if (!absolutePath) {
      throw new Error(`The schema file must have a path, to able to dereference documents`);
    }

    const baseUri = path.dirname(absolutePath);
    const traverser = await Dereferencer.create<OpenrpcDocument>(baseUri, absolutePath, document);

    const parserImpl = new OpenRpcParserImpl(traverser);
    return Promise.resolve(parserImpl.docToGenericModel());
  }

  canHandle(schemaFile: SchemaFile): Promise<boolean> {

    const path = schemaFile.getAbsolutePath() || '';
    if (path.endsWith('.json')) {
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }
}

const JSONRPC_10_PARSER_OPTIONS: IRequiredParserOptions = {
  ...DEFAULT_PARSER_OPTIONS,
  ...{
    jsonRpcPropertyName: undefined,
    jsonRpcVersion: "1.0",
    jsonRpcIdIncluded: false,
    jsonRpcErrorPropertyName: 'error',
    jsonRpcErrorNameIncluded: true,
    jsonRpcErrorSchema: undefined,
    jsonRpcErrorDataSchema: undefined,
  }
};

const JSONRPC_11_PARSER_OPTIONS: IRequiredParserOptions = {
  ...DEFAULT_PARSER_OPTIONS,
  ...{
    jsonRpcPropertyName: 'version',
    jsonRpcVersion: "1.1",
    jsonRpcIdIncluded: false,
    jsonRpcErrorPropertyName: 'error',
    jsonRpcErrorNameIncluded: true,
    jsonRpcErrorSchema: undefined,
    jsonRpcErrorDataSchema: undefined,
  }
};

const JSONRPC_20_PARSER_OPTIONS: IRequiredParserOptions = {
  ...DEFAULT_PARSER_OPTIONS,
  ...{
    jsonRpcPropertyName: 'jsonrpc',
    jsonRpcVersion: "2.0",
    jsonRpcIdIncluded: false,
    jsonRpcErrorPropertyName: 'data',
    jsonRpcErrorNameIncluded: false,
    jsonRpcErrorSchema: undefined,
    jsonRpcErrorDataSchema: undefined,
  }
};

/**
 * TODO: Remove this class, keep the global variables in the class above
 */
class OpenRpcParserImpl {

  static readonly PATTERN_PLACEHOLDER = new RegExp(/^[$]{([^}]+)}$/);
  static readonly PATTERN_PLACEHOLDER_RELAXED = new RegExp(/(?:[$]{([^}]+)}$|^{{([^}]+?)}}$|^[$](.+?)$)/);

  private readonly _options: IRequiredParserOptions;

  private _unknownError?: OmniOutput;

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

  // TODO: Move this to the root? But always have the key be the absolute path?
  private readonly _typeMap = new Map<string, OmniType>();

  private readonly _postDiscriminatorMapping: PostDiscriminatorMapping[] = [];

  private readonly _deref: Dereferencer<OpenrpcDocument>;

  private get doc(): OpenrpcDocument {
    return this._deref.getFirstRoot();
  }

  constructor(dereferencer: Dereferencer<OpenrpcDocument>, options = DEFAULT_PARSER_OPTIONS) {
    const opt = {...options}; // Copy the options, so we do not manipulate the given object.
    OpenRpcParserImpl.updateOptionsFromDocument(dereferencer.getFirstRoot(), opt);

    // TODO: This whole part should be generalized and placed somewhere
    //        To make it an easy-to-understand system of where settings come from and fill in gaps
    if (!opt.jsonRpcVersion) {

      // There is no known JSON-RPC version set.
      // We will currently just fallback on "2.0" since OpenRPC does not seem to have a way of specifying spec version.
      opt.jsonRpcVersion = "2.0";
    }

    let versionFallback: IRequiredParserOptions;
    if (opt.jsonRpcVersion.startsWith('1.0')) {
      versionFallback = JSONRPC_10_PARSER_OPTIONS;
    } else if (opt.jsonRpcVersion.startsWith('1.1')) {
      versionFallback = JSONRPC_11_PARSER_OPTIONS;
    } else {
      versionFallback = JSONRPC_20_PARSER_OPTIONS;
    }

    this._deref = dereferencer;
    this._options = {
      ...opt,
      ...{
        jsonRpcVersion: opt.jsonRpcVersion || versionFallback.jsonRpcVersion,
        jsonRpcPropertyName: opt.jsonRpcPropertyName || versionFallback.jsonRpcPropertyName,
        jsonRpcErrorPropertyName: opt.jsonRpcErrorPropertyName || versionFallback.jsonRpcErrorPropertyName,
        jsonRpcErrorNameIncluded: opt.jsonRpcErrorNameIncluded || versionFallback.jsonRpcErrorNameIncluded,
        jsonRpcErrorDataSchema: undefined,
      }
    };

    // Set this as a second stage after we have assigned all the other options.
    this._options.jsonRpcErrorDataSchema = this.transformErrorDataSchemaToOmniType(
      opt.jsonRpcErrorDataSchema || versionFallback.jsonRpcErrorDataSchema
    )
  }

  /**
   * TODO: Check if this actually works -- since this._options has not been assigned yet!
   */
  private transformErrorDataSchemaToOmniType(schema: JSONSchema7 | OmniType | undefined): OmniType | undefined {

    if (!schema) {
      return schema;
    }

    if (schema.hasOwnProperty('kind')) {
      const omniType = schema as OmniType;
      logger.info(`Using the given omni type '${OmniModelUtil.getTypeDescription(omniType)}'`);
      return omniType;
    }

    // The type is a JSONSchema7, though the type system seems unsure of that fact.
    const jsonSchema = schema as JSONSchema7;
    const derefJsonSchema = this._deref.get(jsonSchema, this.doc);
    const omniType = this.jsonSchemaToType('JsonRpcCustomErrorPayload', derefJsonSchema, undefined).type;
    logger.info(`Using the from jsonschema converted omni type '${OmniModelUtil.getTypeDescription(omniType)}'`);
    return omniType;
  }

  private static updateOptionsFromDocument(doc: OpenrpcDocument, opt: IParserOptions): void {

    // TODO: This should be moved somewhere generic, since it should work the same in all languages.
    const unsafeOptions = opt as unknown as Record<string, unknown>;
    const customOptions = doc['x-omnigen'] as Record<string, unknown>;
    if (customOptions) {
      logger.info(`Received options ${JSON.stringify(customOptions)}`);
      const optionsKeys = Object.keys(customOptions);
      for (const key of optionsKeys) {

        const value = customOptions[key];
        const camelKey = camelCase(key);

        if (value !== undefined) {
          // if (!unsafeOptions.hasOwnProperty(camelKey)) {
          //   logger.warn(`Tried to set option '${camelKey}' which does not exist`);
          // } else {

            const existingType = typeof (unsafeOptions[camelKey]);
            const newType = typeof (value);

            unsafeOptions[camelKey] = value;
            if (existingType !== newType && existingType != 'undefined') {
              logger.warn(`Set option '${camelKey}' to '${String(value)}' (but '${newType}' != '${existingType}'`);
            } else {
              logger.info(`Set option '${camelKey}' to '${String(value)}'`);
            }
          // }
        }
      }
    }
  }

  docToGenericModel(): OmniModel {

    const endpoints = this.doc.methods.map(it => this.toOmniEndpointFromMethod(this._deref.get(it, this._deref.getFirstRoot())));
    const contact = this.doc.info.contact ? this.toOmniContactFromContact(this.doc.info.contact) : undefined;
    const license = this.doc.info.license ? this.toOmniLicenseFromLicense(this.doc.info.license) : undefined;
    const servers = (this.doc.servers || []).map((server) => this.toOmniServerFromServerObject(server));
    const docs = this.doc.externalDocs ? [this.toOmniExternalDocumentationFromExternalDocumentationObject(this.doc.externalDocs)] : [];
    const continuations = endpoints.flatMap(it => this.toOmniLinkFromDocMethods(it, endpoints));

    // Now find all the types that were not referenced by a method, but is in the contract.
    // We most likely still want those types to be included.
    // const extraTypes: OmniType[] = [];
    if (this.doc.components?.schemas) {
      for (const key of Object.keys(this.doc.components.schemas)) {
        const schema = this.doc.components.schemas[key] as JSONSchemaObject;
        const deref = this._deref.get(schema, this._deref.getFirstRoot());
        const unwrapped = this.unwrapJsonSchema(deref);

        // Call to get the type from the schema.
        // That way we make sure it's in the type map.
        this.jsonSchemaToType(deref.hash || key, unwrapped, `/components/schemas/${key}`);
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
      types: [...this._typeMap.values()],
    };

    // Let's do the discriminator mapping which could not be done earlier in the process.
    // If we got here, then the type does not have any other mappings specified.
    for (const postDiscriminator of this._postDiscriminatorMapping) {

      if (typeof postDiscriminator.schema.obj == 'boolean') {
        continue;
      }

      const inheritors = OmniModelUtil.getTypesThatInheritFrom(model, postDiscriminator.type);
      const propertyName = postDiscriminator.schema.obj.discriminator.propertyName;

      const subTypeHints: OmniSubTypeHint[] = [];
      for (const inheritor of inheritors) {

        subTypeHints.push({
          type: inheritor,
          qualifiers: [
            {
              path: [propertyName],
              operator: OmniComparisonOperator.EQUALS,
              // TODO: This is VERY LIKELY INVALID! Must get the originating reference name or something!
              value: OmniModelUtil.getVirtualTypeName(inheritor),
            }
          ]
        })
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

    return model;
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
      this._deref.get(method.obj.result, method.root)
    );

    const responses: OmniOutput[] = [];

    // One regular response
    responses.push(resultResponse.output);

    // And then one response for each potential error
    const errorsOrReferences: MethodObjectErrors = method.obj.errors || [];
    // if (errorsOrReferences.length == 0) {
    // We will always add the generic error classes, since we can never trust that the server will be truthful.
    errorsOrReferences.push({
      code: -1234567890,
      message: 'Unknown Error',
    });
    // }

    const errorOutputs = errorsOrReferences.map(it => {
      const deref = this._deref.get(it, method.root);
      return this.errorToGenericOutput(pascalCase(method.obj.name), deref);
    });

    responses.push(...errorOutputs);

    const examples = (method.obj.examples || []).map(it => {
      const deref = this._deref.get(it, method.root);
      return this.examplePairingToGenericExample(resultResponse.type, typeAndProperties.properties || [], deref);
    })

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
        type: typeAndProperties.type
      },
      requestQualifiers: [
        {
          path: ['method'],
          operator: OmniComparisonOperator.EQUALS,
          value: method.obj.name,
        },
      ],
      responses: responses,
      deprecated: method.obj.deprecated,
      examples: examples,
      externalDocumentations: method.obj.externalDocs
        ? [this.toOmniExternalDocumentationFromExternalDocumentationObject(method.obj.externalDocs)]
        : [],
    };
  }

  private jsonSchemaToType(
    name: TypeName,
    schema: Dereferenced<JSONSchema7Definition>,
    fallbackRef: string | undefined
  ): SchemaToTypeResult {

    // If contentDescriptor contains an anonymous schema,
    // then we want to be able to say that the ref to that schema is the ref of the contentDescriptor.
    // That way we will not get duplicates of the schema when called from different locations.
    let actualRef: string | undefined;
    if (schema.hash && !schema.mix) {

      // We can only use the hash as the unique key if the schema was not from a mix.
      actualRef = schema.hash;
    } else if (fallbackRef) {

      // The fallback ref can be used if a nested schema should use the ref of a parent as the unique type name.
      actualRef = fallbackRef;
    }

    if (actualRef) {
      const existing = this._typeMap.get(actualRef);
      if (existing) {
        return {
          type: existing,
          canInline: schema.hash == undefined
        };
      }

      // The ref is the much better unique name of the type.
      if (schema.hash && !schema.mix) {

        // We only use the ref as a replacement name if the actual element has a ref.
        // We do not include the fallback ref here, since it might not be the best name.
        // We also cannot use the hash as the name
        name = schema.hash;
      }
    }

    const schemaType = this.jsonSchemaToTypeUncached(schema, name, actualRef);

    if (actualRef) {
      this._typeMap.set(actualRef, schemaType);
    }

    return {
      type: schemaType,
      canInline: schema.hash == undefined
    };
  }

  private jsonSchemaToTypeUncached(
    schema: Dereferenced<JSONSchema7Definition | OpenApiJSONSchema7Definition>,
    name: TypeName,
    actualRef: string | undefined
  ): OmniType {

    if (typeof schema.obj == 'boolean') {
      return {
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.BOOL,
      };
    }

    const nonClassType = this.jsonSchemaToNonClassType(schema, name);

    if (nonClassType) {
      return nonClassType;
    }

    const schemaObj = schema.obj;
    const names: TypeName = [
      name,
      (fn) => {
        if (schemaObj.title) {
          return `${pascalCase(schemaObj.title)}${Naming.safe(name, fn)}`;
        } else {
          return undefined;
        }
      },
      (fn) => {
        if (schemaObj.type) {
          return `${pascalCase(String(schemaObj.type))}${Naming.safe(name, fn)}`;
        } else {
          return undefined;
        }
      }
    ];

    const type: OmniObjectType = {
      name: names,
      kind: OmniTypeKind.OBJECT,
      description: schema.obj.description,
      title: schema.obj.title,
      readOnly: schema.obj.readOnly,
      writeOnly: schema.obj.writeOnly,
      properties: [],

      // TODO: This is incorrect. 'additionalProperties' is more advanced than true/false
      additionalProperties: (schema.obj.additionalProperties == undefined
          ? undefined
          : typeof schema.obj.additionalProperties == 'boolean'
            ? schema.obj.additionalProperties
            : true
      )
    };

    if (actualRef) {

      // Need to save it to the type map as soon as we can.
      // Otherwise we might end up with recursive loops in the schema.
      // This way we might be able to mitigate most of them.
      this._typeMap.set(actualRef, type);
    }

    const properties: OmniProperty[] = [];
    const requiredProperties: OmniProperty[] = [];
    if (schema.obj.properties) {
      for (const key of Object.keys(schema.obj.properties)) {
        const propertySchemaOrRef = this._deref.get(schema.obj.properties[key], schema.root);
        const omniProperty = this.toOmniPropertyFromJsonSchema7(type, key, propertySchemaOrRef);
        properties.push(omniProperty);
        if (schema.obj.required?.indexOf(key) !== -1) {
          requiredProperties.push(omniProperty);
        }
      }
    }

    type.properties = properties;
    type.requiredProperties = requiredProperties;

    if (schema.obj.not) {
      // ???
    }

    if (schema.obj.multipleOf) {
      // TODO: Make this general, so that all other places call it.
    }

    return this.extendOrEnhanceClassType(schema, type, name);
  }

  private jsonSchemaToNonClassType(schema: Dereferenced<JSONSchema7Definition>, name: TypeName): OmniType | undefined {

    if (typeof schema.obj == 'boolean') {
      return undefined;
    }

    if (typeof schema.obj.type === 'string') {
      if (schema.obj.type === 'array') {
        return this.getArrayItemType(schema, schema.obj.items, name);
      } else if (schema.obj.type !== 'object') {

        // TODO: This is not lossless if the primitive has comments/summary/etc
        const enumValues = schema.obj.const ? [schema.obj.const] : schema.obj.enum;
        return this.typeToGenericKnownType(name, schema.obj.type, schema.obj.format, schema.obj.description, enumValues);
        // const schemaType = schema.obj.type;
        // if (t.length == 1) {
        //   // return ;
        // } else if (t.length == 3) {
        //   if (t[0] == OmniTypeKind.ENUM) {
        //     return {
        //       name: name ?? schemaType,
        //       kind: t[0],
        //       primitiveKind: t[1],
        //       enumConstants: t[2],
        //       description: schema.obj.description,
        //     };
        //   } else {
        //     return {
        //       name: name ?? schemaType,
        //       kind: t[0],
        //       primitiveKind: t[1],
        //       valueConstant: t[2],
        //       description: schema.obj.description,
        //     };
        //   }
        // }
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  public extendOrEnhanceClassType(
    schema: Dereferenced<JSONSchema7Definition | OpenApiJSONSchema7Definition>,
    type: OmniObjectType,
    name: TypeName
  ): OmniType {

    // TODO: Work needs to be done here which merges types if possible.
    //        If the type has no real content of its own, and only inherits,
    //        Then it might be that this "type" can cease to exist and instead be replaced by its children

    // TODO: Make it optional to "simplify" types that inherit from a primitive -- instead make it use @JsonValue (and maybe @JsonCreator)
    if (typeof schema.obj == 'boolean') {
      throw new Error(`Not allowed to be a boolean`);
    }

    const compositionsOneOfOr: OmniType[] = [];
    const compositionsAllOfAnd: OmniType[] = [];
    const compositionsAnyOfOr: OmniType[] = [];
    let compositionsNot: OmniType | undefined;

    if (schema.obj.oneOf) {

      if (schema.obj.oneOf.length == 1) {
        // Weird way of writing the schema, but if it's just 1 then it's same as "allOf"
        schema.obj.allOf = (schema.obj.allOf || []).concat(schema.obj.oneOf);
        schema.obj.oneOf = undefined;
      } else {
        for (const oneOf of schema.obj.oneOf) {
          const deref = this._deref.get(oneOf, schema.root);

          // TODO: Make this simpler. Create a new method for getting preferred name of a class!
          //        It needs to take care of the dereferencing if needed, and the fallback from hash, etc, etc
          //        The automatic fallback of the schema should be able to be multiple things, like the type name
          //        ALSO! For Java, the composite class should be merged with parent if it is empty!
          //        It is just stupid to have TagOrString extend TagXOrString
          const unwrapped = this.unwrapJsonSchema(deref);
          const oneOfTitle = this.getPreferredName(unwrapped, unwrapped, '');
          compositionsOneOfOr.push(this.jsonSchemaToType(oneOfTitle, deref, undefined).type);
        }
      }
    }

    if (schema.obj.allOf) {
      for (const entry of schema.obj.allOf) {
        const subType = this.jsonSchemaToType(name, this._deref.get(entry, schema.root), undefined);
        if (subType.canInline) {
          // This schema can actually just be consumed by the parent type.
          // This happens if the sub-schema is anonymous and never used by anyone else.
          this.mergeType(subType.type, type);
        } else {
          compositionsAllOfAnd.push(subType.type);
        }
      }
    }

    if (schema.obj.anyOf) {
      for (const subType of schema.obj.anyOf.map(it => this.jsonSchemaToType(name, this._deref.get(it, schema.root), undefined))) {
        compositionsAnyOfOr.push(subType.type);
      }
    }

    // TODO: This is wrong -- it needs to be done in order
    if (schema.obj.not && typeof schema.obj.not !== 'boolean') {
      compositionsNot = (this.jsonSchemaToType(name, {obj: schema.obj.not, root: schema.root}, undefined)).type;
    }

    let subTypeHints: OmniSubTypeHint[] | undefined = undefined;
    const discriminatorAware = this.getDiscriminatorAware(schema);
    if (discriminatorAware) {

      // This is an OpenApi JSON Schema.
      // Discriminators do not actually exist in JSONSchema, but it is way too useful to not make use of.
      // I think most people would think that this is supported for OpenRpc as well, as it should be.
      subTypeHints = this.getSubTypeHints(discriminatorAware, type);
    }

    let extendedBy = CompositionUtil.getCompositionOrExtensionType(
      compositionsAnyOfOr,
      compositionsAllOfAnd,
      compositionsOneOfOr,
      compositionsNot
    );

    if (extendedBy && subTypeHints && subTypeHints.length > 0) {

      // We have subTypeHints, and also an extension.
      // Right now we will skip the extension if it is a composition type.
      // NOTE: This is most likely incorrect
      // TODO: Need to figure out a better and more reliable way of handling this
      // TODO: Need a way to "minimize" tbe given composition, by removing the types that are mapped
      //        Then we keep what is left, if anything is left.
      if (extendedBy.kind == OmniTypeKind.COMPOSITION) {
        extendedBy = undefined;
      }
    }

    if (extendedBy && this.canBeReplacedBy(type, extendedBy)) {

      // Simplify empty types by only returning the inner content.
      const newType: OmniType = {
        ...extendedBy,
        ...{
          description: extendedBy.description || type.description,
          summary: extendedBy.summary || type.summary,
          title: extendedBy.title || type.title,
        }
      };

      // TODO: A bit ugly? Is there a better way, or just a matter of introducing a helper method that does it for us?
      if ('name' in newType || newType.kind == OmniTypeKind.COMPOSITION || newType.kind == OmniTypeKind.INTERFACE) {

        // The name should be kept the same, since it is likely much more specific.
        newType.name = type.name;
      }

      return newType;
    }

    type.subTypeHints = subTypeHints;

    // NOTE: "extendedBy" could be an ENUM, while "type" is an Object.
    // This is not allowed in some languages. But it is up to the target language to decide how to handle it.
    if (extendedBy) {

      const extendableType = OmniModelUtil.asInheritableType(extendedBy);
      if (!extendableType) {
        throw new Error(`Not allowed to use '${OmniModelUtil.getTypeDescription(extendedBy)}' as an extension type`);
      }

      type.extendedBy = extendableType;
    }

    return type;
  }

  private canBeReplacedBy(type: OmniObjectType, extension: OmniType): boolean {

    if (OmniModelUtil.isEmptyType(type)) {
      if (extension.kind == OmniTypeKind.COMPOSITION && extension.compositionKind == CompositionKind.XOR) {
        return true;
      }
    }

    return false;
  }

  private getDiscriminatorAware(
    schema: Dereferenced<JSONSchema7Definition | OpenApiJSONSchema7Definition>
  ): Dereferenced<OpenApiJSONSchema7> | undefined {

    if (typeof schema.obj == 'boolean') {
      return undefined;
    }

    if ('discriminator' in schema.obj) {
      return {
        obj: schema.obj,
        hash: schema.hash,
        root: schema.root,
        mix: schema.mix
      };
    }

    return undefined;
  }

  private getSubTypeHints(schema: Dereferenced<OpenApiJSONSchema7Definition>, type: OmniObjectType): OmniSubTypeHint[] | undefined {

    const subTypeHints: OmniSubTypeHint[] = [];

    if (typeof schema.obj == 'boolean') {
      return undefined;
    }

    const mapping = schema.obj.discriminator.mapping;
    const discriminatorPropertyName = schema.obj.discriminator.propertyName;

    if (mapping) {

      // We have manual mappings. That's good, makes things a bit easier.
      // If we receive a propertyName that is not in this mapping, then the type lookup must be done at runtime.
      // That should be done by building a ref to '#/components/schemas/${propertyValue}
      for (const key of Object.keys(mapping)) {
        const ref = mapping[key];
        try {

          const deref = this._deref.getFromRef<JSONSchema7>(ref, undefined, schema.root);
          const type = this.jsonSchemaToType(deref.hash || ref, deref, undefined);

          subTypeHints.push({
            type: type.type,
            qualifiers: [
              {
                path: [discriminatorPropertyName],
                operator: OmniComparisonOperator.EQUALS,
                value: key
              }
            ]
          });

          // TODO: If "mappings" is given, then add that class as extension to all classes being pointed to
          // TODO: If no "mappings" is given, then that must be part of the runtime mapping instead
          // TODO: ... do this later? And focus on fully functional interfaces code first, without complexity of mappings? YES!!!! DO IT!

        } catch (ex) {
          throw new Error(
            `Could not find schema for mapping ${ref}: ${String(ex)}`,
            {cause: (ex instanceof Error) ? ex : undefined}
          );
        }
      }
    }

    const subSchemas = (schema.obj.anyOf || []).concat(schema.obj.oneOf || []);
    if (subSchemas.length > 0) {

      // TODO: If if is "oneOf" and no other, then those should become SUB-TYPES! Make sure it is so!
      for (const subSchema of subSchemas) {

        const deref = this._deref.get(subSchema, schema.root);
        if (!deref.hash) {
          continue;
        }

        const lastSlashIndex = deref.hash.lastIndexOf('/');
        const supposedPropertyValue = deref.hash.substring(lastSlashIndex + 1);
        const existingMapping = subTypeHints.find(it => it.qualifiers.find(q => (q.value == supposedPropertyValue)));
        if (existingMapping) {
          continue;
        }

        const subType = this.jsonSchemaToType(deref.hash, deref, undefined).type;
        if (subTypeHints.find(it => it.type == subType)) {
          logger.debug(`Skipping ${discriminatorPropertyName} as ${OmniModelUtil.getTypeDescription(subType)} since it has a custom key`);
          continue;
        }

        subTypeHints.push({
          type: subType,
          qualifiers: [
            {
              path: [discriminatorPropertyName],
              operator: OmniComparisonOperator.EQUALS,
              value: supposedPropertyValue
            }
          ]
        })

      }
    } else {

      // This schema does not contain any sub-schemas, so we cannot know which types that uses this schema.
      // HOWEVER, we can do that in post, after all other processing has been done.
      // NOTE: It might be beneficial to do this every time, even if there are sub-schemas provided.
      if (this._options.autoTypeHints) {
        this._postDiscriminatorMapping.push({
          type: type,
          schema: schema
        });
      }
    }

    if (subTypeHints.length == 0) {
      return undefined;
    }

    return subTypeHints;
  }

  private getArrayItemType(
    schema: Dereferenced<JSONSchema7Definition>,
    items: JSONSchema7Items,
    name: TypeName | undefined
  ): OmniArrayTypes {

    if (typeof schema.obj == 'boolean') {
      throw new Error(`The schema object should not be able to be a boolean`);
    }

    if (!items) {
      // No items, so the schema for the array items is undefined.
      return {
        kind: OmniTypeKind.ARRAY,
        minLength: schema.obj.minItems,
        maxLength: schema.obj.maxItems,
        description: schema.obj.description,
        of: {
          kind: OmniTypeKind.UNKNOWN,
        },
      };

    } else if (typeof items == 'boolean') {
      throw new Error(`Do not know how to handle a boolean items '${name ? Naming.safe(name) : ''}'`);
    } else if (Array.isArray(items)) {

      // TODO: We should be introducing interfaces that describe the common denominators between the different items?
      // TODO: This needs some seriously good implementation on the code-generator side of things.
      // TODO: What do we do here if the type can be inlined? Just ignore I guess?

      const staticArrayTypes = items.map(it => {
        const derefArrayItem = this._deref.get(it, schema.root);
        // NOTE: The name below is probably extremely wrong. Fix once we notice a problem.
        return this.jsonSchemaToType(derefArrayItem.hash || 'UnknownArrayItem', derefArrayItem, undefined);
      });

      const commonDenominator = JavaUtil.getCommonDenominator(...staticArrayTypes.map(it => it.type));

      const arrayByPositionType: OmniArrayTypesByPositionType = {
        // name: name ?? `ArrayOf${staticArrayTypes.map(it => Naming.safer(it.type)).join('And')}`,
        kind: OmniTypeKind.ARRAY_TYPES_BY_POSITION,
        types: staticArrayTypes.map(it => it.type),
        description: schema.obj.description,
        commonDenominator: commonDenominator,
      };

      return arrayByPositionType;

    } else {

      // items is a single JSONSchemaObject
      const itemsSchema = this.unwrapJsonSchema({obj: items, root: schema.root});
      let itemTypeName: TypeName;
      if (itemsSchema.obj.title) {
        itemTypeName = pascalCase(itemsSchema.obj.title);
      } else {
        itemTypeName = (fn) => `${name ? Naming.safe(name, fn) : ''}Item`;
      }

      const itemType = this.jsonSchemaToType(itemTypeName, itemsSchema, undefined);

      return {
        kind: OmniTypeKind.ARRAY,
        minLength: schema.obj.minItems,
        maxLength: schema.obj.maxItems,
        description: schema.obj.description,
        of: itemType.type,
      };
    }
  }

  private mergeType(from: OmniType, to: OmniType, lossless = true): OmniType {

    if (from.kind == OmniTypeKind.OBJECT && to.kind == OmniTypeKind.OBJECT) {

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

  private mergeTwoPropertiesAndAddToClassType(a: OmniProperty, b: OmniProperty, to: OmniObjectType): void {
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

      // TODO: Can we introduce generics here in some way?
      const vsString = `${OmniModelUtil.getTypeDescription(a.type)} vs ${OmniModelUtil.getTypeDescription(b.type)}`;
      const errMessage = `No common type for merging properties ${a.name}. ${vsString}`;
      throw new Error(errMessage);
    }
  }

  private addPropertyToClassType(property: OmniProperty, toType: OmniObjectType, as?: OmniType): void {

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

  private getVendorExtension<R>(obj: Dereferenced<JsonObject> | JsonObject, key: string): R | undefined {

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

  private unwrapJsonSchema(schema: Dereferenced<JSONSchema7Definition | JSONSchema>): Dereferenced<JSONSchema7> {
    if (typeof schema.obj == 'boolean') {
      if (schema.obj) {
        return {obj: {}, root: schema.root, hash: schema.hash, mix: schema.mix};
      } else {
        return {obj: {not: {}}, root: schema.root, hash: schema.hash, mix: schema.mix};
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      const deref = this._deref.get<JSONSchema7>(schema.obj as JSONSchema7, schema.root);
      return {
        obj: deref.obj,
        hash: deref.hash || schema.hash,
        root: deref.root || schema.root,
        mix: deref.mix || schema.mix, // If one is mix, result is mix
      };
    }
  }

  private toOmniTypeFromContentDescriptor(
    contentDescriptor: Dereferenced<ContentDescriptorObject>,
    fallbackName?: TypeName
  ): SchemaToTypeResult {

    const derefSchema = this.unwrapJsonSchema({
      obj: contentDescriptor.obj.schema,
      root: contentDescriptor.root
    });

    const preferredName = this.getPreferredContentDescriptorName(derefSchema, contentDescriptor, fallbackName);
    return this.jsonSchemaToType(preferredName, derefSchema, contentDescriptor.hash);
  }

  private getPreferredContentDescriptorName(
    schema: Dereferenced<JSONSchema7>,
    contentDescriptor: Dereferenced<ContentDescriptorObject>,
    fallbackName?: TypeName
  ): TypeName {

    const names = this.getMostPreferredNames(contentDescriptor, schema);
    names.push(contentDescriptor.obj.name);
    if (fallbackName) {
      names.push(fallbackName);
    }
    if (contentDescriptor.obj && contentDescriptor.obj.description && contentDescriptor.obj.description.length < 20) {
      // Very ugly, but it's something?
      names.push(pascalCase(contentDescriptor.obj.description));
    }
    names.push(...this.getFallbackNamesOfJsonSchemaType(schema));

    return names;
  }

  private getPreferredName(
    schema: Dereferenced<JSONSchema7>,
    dereferenced: Dereferenced<unknown>,
    fallback: TypeName
  ): TypeName {

    const names = this.getMostPreferredNames(dereferenced, schema);
    names.push(...this.getFallbackNamesOfJsonSchemaType(schema));

    if (fallback) {
      names.push(fallback);
    }

    return names;
  }

  private getFallbackNamesOfJsonSchemaType(
    schema: Dereferenced<JSONSchema7>
  ): TypeName[] {

    const names: TypeName[] = [];
    if (schema.obj.type) {
      if (Array.isArray(schema.obj.type)) {
        names.push(pascalCase(schema.obj.type.join('_')));
      } else {
        if (schema.obj.type) {
          names.push(pascalCase(schema.obj.type));
        }
      }
    }

    return names;
  }

  private getMostPreferredNames(dereferenced: Dereferenced<unknown>, schema: Dereferenced<JSONSchema7>): TypeName[] {
    const names: TypeName[] = [];
    if (dereferenced.hash) {
      names.push(dereferenced.hash);
    }

    if (schema.obj.title) {
      names.push(schema.obj.title);
    }

    return names;
  }

  private toOmniOutputFromContentDescriptor(method: MethodObject, contentDescriptor: Dereferenced<ContentDescriptorObject>): OutputAndType {

    const typeNamePrefix = pascalCase(method.name);

    // TODO: Should this always be unique, or should we ever use a common inherited method type?
    // TODO: Reuse the code from contentDescriptorToGenericProperty -- so they are ALWAYS THE SAME
    const resultParameterType = this.toOmniTypeFromContentDescriptor(
      contentDescriptor,
      `${typeNamePrefix}ResponsePayload`
    );

    const resultType: OmniType = {
      name: `${typeNamePrefix}Response`,
      kind: OmniTypeKind.OBJECT,
      additionalProperties: false,
      properties: [],
      description: method.description,
      summary: method.summary,
    };

    if (!this._jsonRpcResponseClass) {

      // TODO: Ability to set this is "abstract", since it should never be used directly
      const jsonRpcResponseClassName = 'JsonRpcResponse'; // TODO: Make it a setting
      this._jsonRpcResponseClass = {
        name: jsonRpcResponseClassName,
        kind: OmniTypeKind.OBJECT,
        description: `Generic class to describe the JsonRpc response package`,
        additionalProperties: false,
        properties: [],
      }
      this._typeMap.set(`#/custom/schemes/${jsonRpcResponseClassName}`, this._jsonRpcResponseClass);

      this._jsonRpcResponseClass.properties = [];

      if (this._options.jsonRpcPropertyName) {
        this._jsonRpcResponseClass.properties.push({
          name: this._options.jsonRpcPropertyName,
          type: {
            kind: OmniTypeKind.PRIMITIVE,
            primitiveKind: OmniPrimitiveKind.STRING,
          },
          owner: this._jsonRpcResponseClass
        });
      }

      this._jsonRpcResponseClass.properties.push({
        name: 'error',
        type: {
          kind: OmniTypeKind.NULL,
        },
        owner: this._jsonRpcResponseClass
      });

      if (this._options.jsonRpcIdIncluded) {
        this._jsonRpcResponseClass.properties.push({
          name: 'id',
          type: {
            kind: OmniTypeKind.PRIMITIVE,
            primitiveKind: OmniPrimitiveKind.STRING,
          },
          owner: this._jsonRpcResponseClass,
        });
      }
    }

    resultType.properties.push({
      name: 'result',
      type: resultParameterType.type,
      owner: resultType
    });

    resultType.extendedBy = this._jsonRpcResponseClass;

    return {
      output: <OmniOutput>{
        name: contentDescriptor.obj.name,
        description: contentDescriptor.obj.description,
        summary: contentDescriptor.obj.summary,
        deprecated: contentDescriptor.obj.deprecated || false,
        required: contentDescriptor.obj.required,
        type: resultType,
        contentType: 'application/json',
        qualifiers: [
          {
            path: ['result'],
            operator: OmniComparisonOperator.DEFINED,
          },
        ],
      },
      type: resultParameterType.type
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

    const errorPropertyType: OmniObjectType = {
      name: `${typeName}Error`,
      kind: OmniTypeKind.OBJECT,
      additionalProperties: false,
      properties: [],
    };

    if (!this._jsonRpcErrorResponseClass) {
      const className = 'JsonRpcErrorResponse'; // TODO: Make it a setting
      this._jsonRpcErrorResponseClass = {
        name: className,
        kind: OmniTypeKind.OBJECT,
        description: `Generic class to describe the JsonRpc error response package`,
        additionalProperties: false,
        properties: [],
      };
      this._typeMap.set(`#/custom/schemes/${className}`, this._jsonRpcErrorResponseClass);

      this._jsonRpcErrorResponseClass.properties = [];
      if (this._options.jsonRpcPropertyName) {
        this._jsonRpcErrorResponseClass.properties.push({
          name: this._options.jsonRpcPropertyName,
          type: {
            kind: OmniTypeKind.PRIMITIVE,
            primitiveKind: OmniPrimitiveKind.STRING
          },
          owner: this._jsonRpcErrorResponseClass
        });
      }

      this._jsonRpcErrorResponseClass.properties.push({
        name: 'result',
        type: {
          kind: OmniTypeKind.NULL,
        },
        owner: this._jsonRpcErrorResponseClass,
      });

      if (this._options.jsonRpcIdIncluded) {
        this._jsonRpcErrorResponseClass.properties.push({
          name: 'id',
          type: {
            kind: OmniTypeKind.PRIMITIVE,
            primitiveKind: OmniPrimitiveKind.STRING,
          },
          owner: this._jsonRpcErrorResponseClass,
        });
      }
    }

    if (!this._jsonRpcErrorInstanceClass) {
      const className = 'JsonRpcError'; // TODO: Make it a setting
      this._jsonRpcErrorInstanceClass = {
        name: className,
        kind: OmniTypeKind.OBJECT,
        description: `Generic class to describe the JsonRpc error inside an error response`,
        additionalProperties: false,
        properties: [],
      };
      this._typeMap.set(`#/custom/schemes/${className}`, this._jsonRpcErrorInstanceClass);

      // TODO: Add any properties here? Or rely on the generic and property compressor transformers?
    }

    errorPropertyType.extendedBy = this._jsonRpcErrorInstanceClass;

    errorPropertyType.properties = [
      // For Trustly we also have something called "Name", which is always "name": "JSONRPCError",
      {
        name: 'code',
        type: {
          kind: OmniTypeKind.PRIMITIVE,
          valueConstant: isUnknownCode ? -1 : error.code,
          valueConstantOptional: isUnknownCode ? true : undefined,
          primitiveKind: OmniPrimitiveKind.INTEGER,
          nullable: PrimitiveNullableKind.NULLABLE
        },
        owner: errorPropertyType,
      },
      {
        name: 'message',
        type: {
          kind: OmniTypeKind.PRIMITIVE,
          valueConstant: error.message,
          valueConstantOptional: true,
          primitiveKind: OmniPrimitiveKind.STRING,
        },
        owner: errorPropertyType,
      },
    ];

    if (error.data || !this._options.jsonRpcErrorDataSchema) {
      // TODO: Check if "data" is a schema object and then create a type, instead of making it an unknown constant?
      errorPropertyType.properties.push({
        name: this._options.jsonRpcErrorPropertyName,
        type: this._options.jsonRpcErrorDataSchema || {
          valueConstant: error.data,
          kind: OmniTypeKind.UNKNOWN,
        },
        owner: errorPropertyType,
      });
    } else {
      errorPropertyType.properties.push({
        name: this._options.jsonRpcErrorPropertyName,
        type: this._options.jsonRpcErrorDataSchema,
        owner: errorPropertyType,
      });
    }

    if (this._options.jsonRpcErrorNameIncluded) {

      errorPropertyType.properties.push({
        name: 'name',
        type: {
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.STRING,
          valueConstant: 'JSONRPCError',
          valueConstantOptional: true
        },
        owner: errorPropertyType,
      });
    }

    const errorType: OmniObjectType = {
      name: typeName,
      accessLevel: OmniAccessLevel.PUBLIC,
      kind: OmniTypeKind.OBJECT,
      extendedBy: this._jsonRpcErrorResponseClass,
      additionalProperties: false,
      properties: [],
    };

    const errorProperty: OmniProperty = {
      name: 'error',
      type: errorPropertyType,
      owner: errorType,
    };

    errorType.properties = [
      errorProperty,
    ];
    errorType.requiredProperties = [errorProperty];

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
      type: errorType,
      contentType: 'application/json',
      qualifiers: qualifiers,
    };
  }

  private examplePairingToGenericExample(valueType: OmniType, inputProperties: OmniProperty[], example: Dereferenced<ExamplePairingObject>): OmniExamplePairing {

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

  private exampleParamToGenericExampleParam(inputProperties: OmniProperty[], param: Dereferenced<ExampleObject>, paramIndex: number): OmniExampleParam {

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
      type: valueType
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

  private toOmniPropertyFromJsonSchema7(
    owner: OmniPropertyOwner,
    propertyName: string,
    schemaOrRef: Dereferenced<JSONSchema7Definition>
  ): OmniProperty {

    // The type name will be replaced if the schema is a $ref to another type.
    const schema = this.unwrapJsonSchema(schemaOrRef);

    const propertyType = this.jsonSchemaToType(
      this.getPreferredName(
        schema,
        schemaOrRef,
        (fn) => {
          // NOTE: This might not be the best way to create the property name
          // But for now it will have to do, since most type names will be a simple type.
          const typeName = OmniModelUtil.getVirtualTypeName(owner);
          return `${Naming.safe(typeName, fn)}${pascalCase(propertyName)}`;
        }
      ),
      schema,
      undefined
    );

    return {
      name: propertyName,
      fieldName: this.getVendorExtension(schema.obj, 'field-name'),
      propertyName: this.getVendorExtension(schema.obj, 'property-name'),
      type: propertyType.type,
      owner: owner,
      description: schema.obj.description,
    };
  }

  private typeToGenericKnownType(
    name: TypeName,
    schemaType: string,
    format?: string,
    description?: string,
    enumValues?: JSONSchema7Type[]
  ): OmniType {

    // TODO: Need to take heed to 'schema.format' for some primitive and/or known types!
    const lcType = schemaType.toLowerCase();
    if (lcType == 'null') {
      return {
        kind: OmniTypeKind.NULL,
        description: description,
      };
    }

    const lcFormat = format?.toLowerCase() ?? '';
    let primitiveType: OmniPrimitiveKind;
    switch (lcType) {
      case 'number':
        switch (lcFormat) {
          case 'decimal':
            primitiveType = OmniPrimitiveKind.DECIMAL;
            break;
          case 'double':
            primitiveType = OmniPrimitiveKind.DOUBLE;
            break;
          case 'float':
            primitiveType = OmniPrimitiveKind.FLOAT;
            break;
          default:
            primitiveType = this.getIntegerPrimitiveFromFormat(lcFormat, OmniPrimitiveKind.NUMBER);
            break;
        }
        break;
      case 'integer':
        primitiveType = this.getIntegerPrimitiveFromFormat(lcFormat, OmniPrimitiveKind.INTEGER);
        break;
      case 'boolean':
        primitiveType = OmniPrimitiveKind.BOOL;
        break;
      case 'string':
        switch (lcFormat) {
          case 'char':
          case 'character':
            primitiveType = OmniPrimitiveKind.CHAR;
            break;
          default:
            primitiveType = OmniPrimitiveKind.STRING;
            break;
        }
        break;
      default:
        logger.warn(`Do not know how to handle primitive type '${lcType}', will assume String`);
        primitiveType = OmniPrimitiveKind.STRING;
        break;
    }

    if (enumValues && enumValues.length > 0) {

      if (enumValues.length == 1) {

        // En ENUM with just one value is the same as a regular constant
        return {
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: primitiveType,
          valueConstant: this.getLiteralValueOfSchema(enumValues[0]),
          description: description,
        };
      }

      let allowedValues: AllowedEnumTsTypes[];
      if (primitiveType == OmniPrimitiveKind.STRING) {
        allowedValues = enumValues.map(it => `${String(it)}`);
      } else if (primitiveType == OmniPrimitiveKind.DECIMAL || primitiveType == OmniPrimitiveKind.FLOAT || primitiveType == OmniPrimitiveKind.NUMBER) {
        allowedValues = enumValues.map(it => Number.parseFloat(`${String(it)}`));
      } else {
        allowedValues = enumValues.map(it => Number.parseInt(`${String(it)}`));
        primitiveType = OmniPrimitiveKind.STRING;
      }

      // TODO: Try to convert the ENUM values into the specified primitive type.
      return {
        name: name ?? schemaType,
        kind: OmniTypeKind.ENUM,
        primitiveKind: primitiveType,
        enumConstants: allowedValues,
        description: description,
      };
    } else {
      return {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: primitiveType,
        valueConstant: undefined,
        description: description,
      };
    }
  }

  private getLiteralValueOfSchema(schema: JSONSchema7Type): OmniPrimitiveConstantValue | undefined {

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

  private getIntegerPrimitiveFromFormat(format: string, fallback: OmniPrimitiveKind.INTEGER | OmniPrimitiveKind.NUMBER): OmniPrimitiveKind {
    switch (format) {
      case 'integer':
      case 'int':
        return OmniPrimitiveKind.INTEGER;
      case 'long':
      case 'int64':
        return OmniPrimitiveKind.LONG;
      default:
        return fallback;
    }
  }

  private toTypeAndPropertiesFromMethod(method: Dereferenced<MethodObject>): TypeAndProperties {

    // TODO: This should be able to be a String OR Number -- need to make this more generic
    const requestIdType: OmniPrimitiveType = {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.STRING,
      nullable: PrimitiveNullableKind.NOT_NULLABLE
    };

    let requestParamsType: OmniPropertyOwner;
    if (method.obj.paramStructure == 'by-position') {
      // The params is an array values, and not a map nor properties.
      requestParamsType = <OmniArrayPropertiesByPositionType>{
        // name: `${method.obj.name}RequestParams`,
        kind: OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION
      };

      requestParamsType.properties = method.obj.params.map((it) => {
        return this.toOmniPropertyFromContentDescriptor(requestParamsType, this._deref.get(it, method.root));
      });

      // TODO: DO NOT USE ANY JAVA-SPECIFIC METHODS HERE! MOVE THEM SOMEPLACE ELSE IF GENERIC ENOUGH!
      requestParamsType.commonDenominator = JavaUtil.getCommonDenominator(...requestParamsType.properties.map(it => it.type));

    } else {

      const objectRequestParamsType: OmniObjectType = {
        name: `${method.obj.name}RequestParams`,
        kind: OmniTypeKind.OBJECT,
        properties: [],
        additionalProperties: false,
      };

      requestParamsType = objectRequestParamsType;

      const properties = method.obj.params.map((it) => {
        return this.toOmniPropertyFromContentDescriptor(requestParamsType, this._deref.get(it, method.root))
      });

      if (properties.length > 0) {
        requestParamsType.properties = properties;
      }

      if (!this._requestParamsClass) {
        this._requestParamsClass = {
          name: 'JsonRpcRequestParams', // TODO: Make it a setting
          kind: OmniTypeKind.OBJECT,
          description: `Generic class to describe the JsonRpc request params`,
          additionalProperties: false,
          properties: [],
        }
      }

      requestParamsType.extendedBy = this._requestParamsClass;
    }

    const objectRequestType: OmniObjectType = {
      name: `${method.obj.name}Request`,
      title: method.obj.name,
      kind: OmniTypeKind.OBJECT,
      properties: [],
      additionalProperties: false,
      description: method.obj.description,
      summary: method.obj.summary,
    };

    const requestType = objectRequestType;

    if (!this._jsonRpcRequestClass) {

      const className = 'JsonRpcRequest'; // TODO: Make it a setting
      this._jsonRpcRequestClass = {
        name: className,
        kind: OmniTypeKind.OBJECT,
        description: `Generic class to describe the JsonRpc request package`,
        additionalProperties: false,
        properties: [],
      };
      this._typeMap.set(`#/custom/schemes/${className}`, this._jsonRpcRequestClass);

      const hasConstantVersion = (this._options.jsonRpcVersion || '').length > 0;
      const requestJsonRpcType: OmniPrimitiveType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.STRING,
        valueConstant: hasConstantVersion ? this._options.jsonRpcVersion : undefined,
        nullable: PrimitiveNullableKind.NOT_NULLABLE
      };

      // TODO: This should be moved to the abstract parent class somehow, then sent down through constructor
      //        Maybe this can be done automatically through GenericOmniModelTransformer?
      //        Or can we do this in some other way? Maybe have valueConstant be string OR callback
      //        Then if callback, it takes the method object, and is put inside the constructor without a given parameter?
      const requestMethodType: OmniPrimitiveType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.STRING,
        readOnly: true,
        valueConstant: (sub) => {
          if (sub.title) {
            return sub.title;
          }

          throw new Error(`The title must be set`);
        },
        nullable: PrimitiveNullableKind.NOT_NULLABLE
      };

      this._jsonRpcRequestClass.properties = [];

      if (this._options.jsonRpcPropertyName) {
        this._jsonRpcRequestClass.properties.push({
          name: this._options.jsonRpcPropertyName,
          type: requestJsonRpcType,
          required: true,
          owner: requestType,
        });
      }

      this._jsonRpcRequestClass.properties.push({
        name: "method",
        type: requestMethodType,
        required: true,
        owner: requestType,
      });

      if (this._options.jsonRpcIdIncluded) {
        this._jsonRpcRequestClass.properties.push({
          name: "id",
          type: requestIdType,
          required: true,
          owner: this._jsonRpcRequestClass,
        });
      }
    }

    requestType.extendedBy = this._jsonRpcRequestClass;

    requestType.properties = [
      {
        name: "params",
        type: requestParamsType,
        owner: requestType,
      }
    ];

    return {
      type: requestType,
      properties: requestParamsType.properties,
    };
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
          logger.error(`Could not build link for ${endpoint.name}: ${ex instanceof Error ? ex.message : ''}`);
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
          linkParamName
        );

        const targetParameter: OmniLinkTargetParameter = {
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
        logger.warn(`Could not find property '${linkParamName}' in '${OmniModelUtil.getTypeDescription(requestResultClass)}'`);
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
    linkParamName: string
  ): OmniLinkSourceParameter {

    const params = link.params as Record<string, unknown>;
    const value = params[linkParamName];
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
            const primaryName = OmniModelUtil.getTypeDescription(primaryType);
            const secondaryName = OmniModelUtil.getTypeDescription(secondaryType);
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

  /**
   * TODO: Move somewhere more generic
   */
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
        throw new Error(`Do not know how to handle '${OmniModelUtil.getTypeDescription(type)}' in property path '${pathParts.join('.')}'`);
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
}
