import {AbstractParser} from '@parse/AbstractParser';

import {
  AllowedEnumOmniPrimitiveTypes,
  AllowedEnumTsTypes,
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
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyOwner,
  OmniServer,
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
  LicenseObject,
  LinkObject,
  MethodObject,
  MethodObjectErrors,
  OpenrpcDocument,
  ServerObject,
} from '@open-rpc/meta-schema';
import {JSONSchema7, JSONSchema7Definition} from 'json-schema';
import {camelCase, pascalCase} from 'change-case';
import {JavaUtil} from '@java';
import * as stringSimilarity from 'string-similarity';
import {Rating} from 'string-similarity';
import {Dereferenced, Dereferencer, LoggerFactory} from '@util';
import {DEFAULT_PARSER_OPTIONS, IParserOptions} from '@parse/IParserOptions';
import {CompositionUtil} from '@parse/CompositionUtil';
import {Naming} from '@parse/Naming';
import * as path from 'path';
import {JsonObject} from 'json-pointer';
import {OpenApiJSONSchema7, OpenApiJSONSchema7Definition} from '@parse/openrpc/OpenApiExtendedJsonSchema';

export const logger = LoggerFactory.create(__filename);

type SchemaToTypeResult = { type: OmniType; canInline: boolean };

type OutputAndType = { output: OmniOutput; type: OmniType };
type TypeAndProperties = { type: OmniType; properties: OmniProperty[] | undefined };

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

/**
 * TODO: Remove this class, keep the global variables in the class above
 */
class OpenRpcParserImpl {

  static readonly PATTERN_PLACEHOLDER = new RegExp(/^[$]{([^}]+)}$/);
  static readonly PATTERN_PLACEHOLDER_RELAXED = new RegExp(/(?:[$]{([^}]+)}$|^{{([^}]+?)}}$|^[$](.+?)$)/);

  private readonly _options: IParserOptions;

  private _unknownError?: OmniOutput;

  // These classes should be optionally created.
  // Used (only?) if:
  // * we are going to automatically try and create generics.
  // * some setting is set to create helper classes
  // TODO: Need to figure out a way of having multiple code generations using these same classes (since they are generic)
  private _jsonRpcRequestClass?: OmniObjectType;
  private _jsonRpcResponseClass?: OmniObjectType;
  private _jsonRpcErrorClass?: OmniObjectType;

  // This class should be optionally created if we are going to try and create generics.
  // It is only going to work like a marker interface, so we can know that all the classes are related.
  // TODO: Need to figure out a way of having multiple code generations using these same classes (since they are generic)
  private _requestParamsClass?: OmniObjectType; // Used

  // TODO: Move this to the root? But always have the key be the absolute path?
  private readonly _typePromiseMap = new Map<string, SchemaToTypeResult>();

  private readonly _deref: Dereferencer<OpenrpcDocument>;

  private get doc(): OpenrpcDocument {
    return this._deref.getFirstRoot();
  }

  constructor(doc: Dereferencer<OpenrpcDocument>, options = DEFAULT_PARSER_OPTIONS) {
    this._options = options;

    this._deref = doc;
    this.updateOptionsFromDocument(doc.getFirstRoot());
  }

  private updateOptionsFromDocument(doc: OpenrpcDocument): void {

    // TODO: This should be moved somewhere generic, since it should work the same in all languages.
    const unsafeOptions = this._options as unknown as Record<string, unknown>;
    const customOptions = doc['x-omnigen'] as Record<string, unknown>;
    if (customOptions) {
      logger.info(`Received options ${JSON.stringify(customOptions)}`);
      const optionsKeys = Object.keys(customOptions);
      for (const key of optionsKeys) {

        const value = customOptions[key];
        const camelKey = camelCase(key);

        if (value !== undefined) {
          if (unsafeOptions[camelKey] === undefined) {
            logger.warn(`Tried to set option '${camelKey}' which does not exist`);
          } else {

            const existingType = typeof (unsafeOptions[camelKey]);
            const newType = typeof (value);

            unsafeOptions[camelKey] = value;
            if (existingType !== newType) {
              logger.warn(`Set option '${camelKey}' to '${String(value)}' (but '${newType}' != '${existingType}'`);
            } else {
              logger.info(`Set option '${camelKey}' to '${String(value)}'`);
            }
          }
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

    return {
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
      types: [...this._typePromiseMap.values()].map(it => it.type),
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
      this._deref.get(method.obj.result, method.root)
    );

    const responses: OmniOutput[] = [];

    // One regular response
    responses.push(resultResponse.output);

    // And then one response for each potential error
    let errorsOrReferences: MethodObjectErrors = method.obj.errors || [];
    if (errorsOrReferences.length == 0) {
      // If there were no known errors specified, then we will add a generic fallback.
      errorsOrReferences = [{
        code: -1234567890,
        message: 'Unknown Error',
      }];
    }

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
      const existing = this._typePromiseMap.get(actualRef);
      if (existing) {
        return existing;
      }

      // The ref is the much better unique name of the type.
      if (schema.hash && !schema.mix) {

        // We only use the ref as a replacement name if the actual element has a ref.
        // We do not include the fallback ref here, since it might not be the best name.
        // We also cannot use the hash as the name
        name = schema.hash;
      }
    }

    const schemaType = this.jsonSchemaToTypeUncached(schema, name, schema.hash == undefined);

    if (actualRef) {
      this._typePromiseMap.set(actualRef, schemaType);
    }

    return schemaType;
  }

  private jsonSchemaToTypeUncached(
    schema: Dereferenced<JSONSchema7Definition | OpenApiJSONSchema7Definition>,
    name: TypeName,
    canInline: boolean
  ): SchemaToTypeResult {

    if (typeof schema.obj == 'boolean') {
      return {
        type: {
          name: 'boolean',
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.BOOL,
        },
        canInline: false
      };
    }

    const nonClassType = this.jsonSchemaToNonClassType(schema, name);

    if (nonClassType) {
      return {
        type: nonClassType,
        canInline: canInline,
      };
    }

    const type: OmniObjectType = {
      name: name, // () => names.map(it => Naming.unwrap(it)).join('_'),
      nameClassifier: schema.obj.title ? pascalCase(schema.obj.title) : (schema.obj.type ? String(schema.obj.type) : undefined),
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

    const extended = this.extendOrEnhanceClassType(schema, type, name);
    return {
      type: extended,

      // If this type is inline in the JSON Schema, without being referenced as a ref:
      // Then we might possibly be able to merge this type with the caller, if it wants to.
      canInline: canInline
    };
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
        const t = this.typeToGenericKnownType(schema.obj.type, schema.obj.format, schema.obj.enum);
        const schemaType = schema.obj.type;
        if (t.length == 1) {
          return {
            name: name ?? schemaType,
            kind: t[0],
            description: schema.obj.description,
          };
        } else if (t.length == 3) {
          return {
            name: name ?? schemaType,
            kind: t[0],
            primitiveKind: t[1],
            enumConstants: t[2],
            description: schema.obj.description,
          };
        } else {
          return {
            name: name ?? schemaType,
            kind: t[0],
            primitiveKind: t[1],
            description: schema.obj.description,
          };
        }
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
          compositionsOneOfOr.push(this.jsonSchemaToType(name, deref, undefined).type);
        }
      }
    }

    // todo: fix back the commented out mergeType -- probable problem
    if (schema.obj.allOf) {
      for (const subType of schema.obj.allOf.map(it => this.jsonSchemaToType(name, this._deref.get(it, schema.root), undefined))) {
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

    let mappingPropertyName: string | undefined;
    let discriminatorMapping: Map<string, OmniType> | undefined;
    const discriminatorAware = this.getDiscriminatorAware(schema);
    if (discriminatorAware) {

      // This is an OpenApi JSON Schema.
      // Discriminators do not actually exist in JSONSchema, but it is way too useful to not make use of.
      // I think most people would think that this is supported for OpenRpc as well, as it should be.
      mappingPropertyName = discriminatorAware.obj.discriminator.propertyName;
      discriminatorMapping = this.getDiscriminatorMapping(discriminatorAware);
    }

    const extendedBy = CompositionUtil.getCompositionOrExtensionType(
      compositionsAnyOfOr,
      compositionsAllOfAnd,
      compositionsOneOfOr,
      compositionsNot,
      mappingPropertyName,
      discriminatorMapping,
    );

    // TODO: Remove this? It should be up to the final language to decide how to handle it, right?
    if (type.additionalProperties == undefined && type.properties.length == 0) {

      // If there object is "empty" but we inherit from something, then just use the inherited type instead.
      // NOTE: This might be "inaccurate" and should maybe be more selective (like ONLY replacing COMPOSITIONS)
      if (extendedBy && extendedBy.kind != OmniTypeKind.COMPOSITION) {

        return <OmniType>{
          ...extendedBy,
          ...{
            // The name should be kept the same, since it is likely much more specific.
            name: type.name,
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

  private getDiscriminatorMapping(schema: Dereferenced<OpenApiJSONSchema7Definition>): Map<string, OmniType> {

    const discriminatorMapping = new Map<string, OmniType>();

    if (typeof schema.obj == 'boolean') {
      return discriminatorMapping;
    }

    const mapping = schema.obj.discriminator.mapping;
    if (mapping) {

      // We have manual mappings. That's good, makes things a bit easier.
      // If we receive a propertyName that is not in this mapping, then the type lookup must be done at runtime.
      // That should be done by building a ref to '#/components/schemas/${propertyValue}
      for (const key of Object.keys(mapping)) {
        const ref = mapping[key];
        try {

          const deref = this._deref.getFromRef<JSONSchema7>(ref, undefined, schema.root);
          // if (!discriminatorMapping) {
          //   discriminatorMapping = new Map<string, OmniType>();
          // }

          const type = this.jsonSchemaToType(deref.hash || ref, deref, undefined);
          discriminatorMapping.set(key, type.type);

          // TODO: If "mappings" is given, then add that class as extension to all classes being pointed to
          // TODO: If no "mappings" is given, then that must be part of the runtime mapping instead
          // TODO: ... do this later? And focus on fully functional interfaces code first, without complexity of mappings? YES!!!! DO IT!

        } catch (ex) {
          throw new Error(
            `Could not find schema for mapping ${ref}`,
            {cause: (ex instanceof Error) ? ex : undefined}
          );
        }
      }
    }

    return discriminatorMapping;
  }

  private getArrayItemType(schema: Dereferenced<JSONSchema7Definition>, items: JSONSchema7Items, name: TypeName | undefined): OmniArrayTypes {

    if (typeof schema.obj == 'boolean') {
      throw new Error(`The schema object should not be able to be a boolean`);
    }

    if (!items) {
      // No items, so the schema for the array items is undefined.
      const arrayTypeName: TypeName = (name)
        ? name
        : `ArrayOfUnknowns`;

      return {
        name: arrayTypeName,
        kind: OmniTypeKind.ARRAY,
        minLength: schema.obj.minItems,
        maxLength: schema.obj.maxItems,
        description: schema.obj.description,
        of: {
          name: () => `UnknownItemOf${Naming.unwrap(arrayTypeName)}`,
          kind: OmniTypeKind.UNKNOWN,
        },
      };

    } else if (typeof items == 'boolean') {
      throw new Error(`Do not know how to handle a boolean items '${name ? Naming.unwrap(name) : ''}'`);
    } else if (Array.isArray(items)) {

      // TODO: We should be introducing interfaces that describe the common denominators between the different items?
      // TODO: This needs some seriously good implementation on the code-generator side of things.
      // TODO: What do we do here if the type can be inlined? Just ignore I guess?

      const staticArrayTypes = items.map(it => {
        const derefArrayItem = this._deref.get(it, schema.root);
        // NOTE: The name below is probably extremely wrong. Fix once we notice a problem.
        return this.jsonSchemaToType(derefArrayItem.hash || 'UnknownArrayItem', derefArrayItem,undefined);
      });

      const commonDenominator = JavaUtil.getCommonDenominator(...staticArrayTypes.map(it => it.type));

      return <OmniArrayTypesByPositionType>{
        name: name ?? `ArrayOf${staticArrayTypes.map(it => Naming.safer(it.type)).join('And')}`,
        kind: OmniTypeKind.ARRAY_TYPES_BY_POSITION,
        types: staticArrayTypes.map(it => it.type),
        description: schema.obj.description,
        commonDenominator: commonDenominator,
      };

    } else {

      // items is a single JSONSchemaObject
      const itemsSchema = this.unwrapJsonSchema({obj: items, root: schema.root});
      let itemTypeName: TypeName;
      if (itemsSchema.obj.title) {
        itemTypeName = pascalCase(itemsSchema.obj.title);
      } else {
        itemTypeName = () => `${name ? Naming.unwrap(name) : ''}Item`;
      }

      const itemType = this.jsonSchemaToType(itemTypeName, itemsSchema, undefined);

      const arrayTypeName: TypeName = (name)
        ? name
        : () => `ArrayOf${Naming.safer(itemType.type)}`;

      return {
        name: arrayTypeName,
        nameClassifier: 'Array',
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
      const vsString = `${Naming.safer(a.type)} vs ${Naming.safer(b.type)}`;
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

  private toOmniTypeFromContentDescriptor(contentDescriptor: Dereferenced<ContentDescriptorObject>): SchemaToTypeResult {

    const derefSchema = this.unwrapJsonSchema({
      obj: contentDescriptor.obj.schema,
      root: contentDescriptor.root
    });


    const preferredName = this.getPreferredName(derefSchema, contentDescriptor, contentDescriptor.obj.name);
    return this.jsonSchemaToType(preferredName, derefSchema, contentDescriptor.hash);
  }

  private getPreferredName(schema: Dereferenced<JSONSchema7>, dereferenced: Dereferenced<unknown>, fallback: string): string {
    return dereferenced.hash || schema.obj.title || fallback;
  }

  private toOmniOutputFromContentDescriptor(method: MethodObject, contentDescriptor: Dereferenced<ContentDescriptorObject>): OutputAndType {

    const typeNamePrefix = pascalCase(method.name);

    // TODO: Should this always be unique, or should we ever use a common inherited method type?
    // TODO: Reuse the code from contentDescriptorToGenericProperty -- so they are ALWAYS THE SAME
    const resultParameterType = this.toOmniTypeFromContentDescriptor(contentDescriptor);

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
      this._jsonRpcResponseClass = {
        name: 'JsonRpcResponse', // TODO: Make it a setting
        kind: OmniTypeKind.OBJECT,
        description: `Generic class to describe the JsonRpc response package`,
        additionalProperties: false,
        properties: [],
      }

      this._jsonRpcResponseClass.properties = [
        {
          name: this._options.jsonRpcPropertyName,
          type: {
            kind: OmniTypeKind.PRIMITIVE,
            primitiveKind: OmniPrimitiveKind.STRING,
            name: `ResultJsonRpc`
          },
          owner: this._jsonRpcResponseClass
        },
        {
          name: 'error',
          type: {
            name: `ResultError`,
            kind: OmniTypeKind.NULL,
          },
          owner: this._jsonRpcResponseClass
        },
      ];

      if (this._options.jsonRpcIdIncluded) {
        this._jsonRpcResponseClass.properties.push({
          name: 'id',
          type: {
            name: `ResultId`,
            kind: OmniTypeKind.PRIMITIVE,
            primitiveKind: OmniPrimitiveKind.STRING,
          },
          owner: this._jsonRpcResponseClass,
        });
      }
    }

    resultType.properties = [
      {
        name: 'result',
        type: resultParameterType.type,
        owner: resultType
      }
    ];

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

    if (!this._jsonRpcErrorClass) {
      this._jsonRpcErrorClass = {
        name: 'JsonRpcError', // TODO: Make it a setting
        kind: OmniTypeKind.OBJECT,
        description: `Generic class to describe the JsonRpc error response package`,
        additionalProperties: false,
        properties: [],
      };

      this._jsonRpcErrorClass.properties = [
        {
          name: 'result',
          type: {
            name: `JsonRpcErrorAlwaysNullResultBody`,
            kind: OmniTypeKind.NULL,
          },
          owner: this._jsonRpcErrorClass,
        },
        {
          name: 'id',
          type: {
            name: `JsonRpcErrorIdString`,
            kind: OmniTypeKind.PRIMITIVE,
            primitiveKind: OmniPrimitiveKind.STRING,
          },
          owner: this._jsonRpcErrorClass,
        },
      ];
    }

    errorPropertyType.extendedBy = this._jsonRpcErrorClass;

    errorPropertyType.properties = [
      // For Trustly we also have something called "Name", which is always "name": "JSONRPCError",
      {
        name: 'code',
        type: {
          name: `${typeName}CodeInteger`,
          valueConstant: isUnknownCode ? undefined : error.code,
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.INTEGER,
        },
        owner: errorPropertyType,
      },
      {
        name: 'message',
        type: {
          name: `${typeName}MessageString`,
          valueConstant: error.message,
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.STRING,
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
          kind: OmniTypeKind.UNKNOWN,
        },
        owner: errorPropertyType,
      },
    ];

    const errorType: OmniObjectType = {
      name: typeName,
      accessLevel: OmniAccessLevel.PUBLIC,
      kind: OmniTypeKind.OBJECT,
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

    const propertyTypeName = this.getPreferredName(schema, schemaOrRef, propertyName);
    const propertyType = this.jsonSchemaToType(propertyTypeName, schema, undefined);

    return {
      name: propertyName,
      fieldName: this.getVendorExtension(schema.obj, 'field-name'),
      propertyName: this.getVendorExtension(schema.obj, 'property-name'),
      type: propertyType.type,
      owner: owner,
      description: schema.obj.description,
    };
  }

  private typeToGenericKnownType(type: string, format?: string, enumValues?: unknown[]):
    [OmniTypeKind.NULL]
    | [OmniTypeKind.PRIMITIVE, OmniPrimitiveKind]
    | [OmniTypeKind.ENUM, AllowedEnumOmniPrimitiveTypes, AllowedEnumTsTypes[]] {

    // TODO: Need to take heed to 'schema.format' for some primitive and/or known types!
    const lcType = type.toLowerCase();
    if (lcType == 'null') {
      return [OmniTypeKind.NULL];
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
      return [OmniTypeKind.ENUM, primitiveType, allowedValues];
    } else {
      return [OmniTypeKind.PRIMITIVE, primitiveType];
    }
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
      name: `${method.obj.name}RequestId`,
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.STRING,
      nullable: PrimitiveNullableKind.NOT_NULLABLE
    };

    let requestParamsType: OmniPropertyOwner;
    if (method.obj.paramStructure == 'by-position') {
      // The params is an array values, and not a map nor properties.
      requestParamsType = <OmniArrayPropertiesByPositionType>{
        name: `${method.obj.name}RequestParams`,
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

      this._jsonRpcRequestClass = {
        name: 'JsonRpcRequest', // TODO: Make it a setting
        kind: OmniTypeKind.OBJECT,
        description: `Generic class to describe the JsonRpc request package`,
        additionalProperties: false,
        properties: [],
      };

      const hasConstantVersion = (this._options.jsonRpcRequestVersion || '').length > 0;
      const requestJsonRpcType: OmniPrimitiveType = {
        name: `JsonRpcRequestVersion`,
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.STRING,
        valueConstant: hasConstantVersion ? this._options.jsonRpcRequestVersion : undefined,
        nullable: PrimitiveNullableKind.NOT_NULLABLE
      };

      // TODO: This should be moved to the abstract parent class somehow, then sent down through constructor
      //        Maybe this can be done automatically through GenericOmniModelTransformer?
      //        Or can we do this in some other way? Maybe have valueConstant be string OR callback
      //        Then if callback, it takes the method object, and is put inside the constructor without a given parameter?
      const requestMethodType: OmniPrimitiveType = {
        name: `JsonRpcRequestMethod`,
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

      this._jsonRpcRequestClass.properties = [
        {
          name: this._options.jsonRpcPropertyName,
          type: requestJsonRpcType,
          required: true,
          owner: requestType,
        },
        {
          name: "method",
          type: requestMethodType,
          required: true,
          owner: requestType,
        }
      ];
    }

    requestType.extendedBy = this._jsonRpcRequestClass;

    requestType.properties = [
      <OmniProperty>{
        name: "params",
        type: requestParamsType,
        owner: requestType,
      }
    ];

    if (this._options.jsonRpcIdIncluded) {
      requestType.properties.push(
        <OmniProperty>{
          name: "id",
          type: requestIdType,
          required: true,
          owner: requestType,
        },
      );
    }

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
        logger.warn(`Could not find property '${linkParamName}' in '${Naming.safer(requestResultClass)}'`);
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
}
