import * as OpenRpc from '@open-rpc/meta-schema';
import {AnyJSONSchema} from '@omnigen/parser-jsonschema';
import {
  ImplOrRef,
  OmnigenOpenRpcComponents,
  OmnigenOpenRpcContact, OmnigenOpenRpcContentDescriptor,
  OmnigenOpenRpcDocument, OmnigenOpenRpcError, OmnigenOpenRpcExample, OmnigenOpenRpcExamplePairing,
  OmnigenOpenRpcExternalDocumentationObject,
  OmnigenOpenRpcInfoObject, OmnigenOpenRpcLicense, OmnigenOpenRpcLink, OmnigenOpenRpcLinkObjectServer,
  OmnigenOpenRpcMethod, OmnigenOpenRpcRef,
  OmnigenOpenRpcServerObject,
  OmnigenOpenRpcServerVariable, OmnigenOpenRpcTag,
} from './OmnigenOpenRpcDocument.ts';

/**
 * NOTE: Not used yet, just an experiment
 */
export class OpenRpcModelConverter {

  public transform(document: OpenRpc.OpenrpcDocument): OmnigenOpenRpcDocument {

    const ogDocument = new OmnigenOpenRpcDocument(
      document.openrpc,
      this.toDocumentInfo(document.info),
      this.toMethods(document.methods),
    );

    if (document.components) {
      document.components = this.toComponents(document.components);
    }

    if (document.externalDocs) {
      ogDocument.externalDocs = this.toExternalDocs(document.externalDocs);
    }

    if (document.servers) {
      ogDocument.servers = document.servers.map(it => this.toServer(it));
    }

    return ogDocument;
  }

  private toComponents(it: OpenRpc.Components): OmnigenOpenRpcComponents {

    const transformed = new OmnigenOpenRpcComponents();

    if (it.contentDescriptors) {
      transformed.contentDescriptors = {};
      for (const [key, descriptor] of Object.entries(it.contentDescriptors)) {
        transformed.contentDescriptors[key] = this.toContentDescriptor(key, descriptor);
      }
    }

    if (it.errors) {
      transformed.errors = {};
      for (const [key, error] of Object.entries(it.errors)) {
        transformed.errors[key] = this.toError(key, error);
      }
    }

    if (it.examplePairings) {
      transformed.examplePairings = {};
      for (const [key, pairing] of Object.entries(it.examplePairings)) {
        transformed.examplePairings[key] = this.toExamplePairing(key, pairing);
      }
    }

    if (it.examples) {
      transformed.examples = {};
      for (const [key, example] of Object.entries(it.examples)) {
        transformed.examples[key] = this.toExample(key, example);
      }
    }

    if (it.links) {
      transformed.links = {};
      for (const [key, link] of Object.entries(it.links)) {
        transformed.links[key] = this.toLink(key, link);
      }
    }

    if (it.schemas) {
      transformed.schemas = {};
      for (const [key, schema] of Object.entries(it.schemas)) {
        transformed.schemas[key] = this.toSchema(key, schema);
      }
    }

    if (it.tags) {
      transformed.tags = {};
      for (const [key, tag] of Object.entries(it.tags)) {
        transformed.tags[key] = this.toTag(key, tag);
      }
    }

    return transformed;
  }

  private toServer(it: OpenRpc.ServerObject): OmnigenOpenRpcServerObject {

    const transformed = new OmnigenOpenRpcServerObject(it.url);

    transformed.description = it.description;
    transformed.name = it.name;
    transformed.summary = it.summary;

    if (it.variables) {
      transformed.variables = {};
      for (const [key, variable] of Object.entries(it.variables)) {
        transformed.variables[key] = this.toServerVariable(key, variable);
      }
    }

    return transformed;
  }

  private toDocumentInfo(it: OpenRpc.InfoObject): OmnigenOpenRpcInfoObject {

    const transformed = new OmnigenOpenRpcInfoObject(it.title, it.version);
    transformed.contact = it.contact ? this.toContact(it.contact) : undefined;
    transformed.description = it.description;
    transformed.license = it.license ? this.toLicense(it.license) : undefined;
    transformed.termsOfService = it.termsOfService;

    return transformed;
  }

  private toMethods(it: OpenRpc.Methods): Array<ImplOrRef<OmnigenOpenRpcMethod>> {
    return it.map(item => this.toMethod(item));
  }

  private toMethod(it: OpenRpc.MethodOrReference): ImplOrRef<OmnigenOpenRpcMethod> {
    return this.assertRef(it, obj => this.toMethodImpl(obj));
  }

  private toMethodImpl(it: OpenRpc.MethodObject): OmnigenOpenRpcMethod {

    const params = it.params.map(item => this.toContentDescriptor(undefined, item));
    const result = this.assertRef(it.result, obj => this.toContentDescriptor(undefined, obj));

    const transformed = new OmnigenOpenRpcMethod(it.name, params, result);
    transformed.tags = it.tags ? it.tags.map(item => this.assertRef(item, obj => this.toTag(undefined, obj))) : undefined;
    transformed.servers = it.servers ? it.servers.map(obj => this.toServer(obj)) : undefined;
    transformed.links = it.links ? it.links.map(item => this.assertRef(item, obj => this.toLink(undefined, obj))) : undefined;
    transformed.externalDocs = it.externalDocs ? this.toExternalDocs(it.externalDocs) : undefined;
    transformed.examples = it.examples ? it.examples.map(item => this.assertRef(item, obj => this.toExamplePairing(undefined, obj))) : undefined;
    transformed.errors = it.errors ? it.errors.map(item => this.assertRef(item, obj => this.toError(undefined, obj))) : undefined;
    transformed.deprecated = it.deprecated;
    transformed.description = it.description;
    transformed.paramStructure = it.paramStructure;
    transformed.summary = it.summary;

    return transformed;
  }

  private toExternalDocs(it: OpenRpc.ExternalDocumentationObject): OmnigenOpenRpcExternalDocumentationObject {

    const transformed = new OmnigenOpenRpcExternalDocumentationObject(it.url);
    transformed.description = it.description;

    return transformed;
  }

  private toContentDescriptor(key: string | undefined, it: OpenRpc.ContentDescriptorOrReference): ImplOrRef<OmnigenOpenRpcContentDescriptor> {

    return this.assertRef(
      it,
      obj => {

        const transformed = new OmnigenOpenRpcContentDescriptor(obj.name, obj.schema as AnyJSONSchema);
        transformed.deprecated = obj.deprecated;
        transformed.description = obj.description;
        transformed.required = obj.required;
        transformed.summary = obj.summary;

        return transformed;
      },
    );
  }

  private toError(key: string | undefined, it: OpenRpc.ErrorObject): OmnigenOpenRpcError {

    const transformed = new OmnigenOpenRpcError(it.code, it.message);
    transformed.data = it.data;

    return transformed;
  }

  private toExamplePairing(key: string | undefined, it: OpenRpc.ExamplePairingObject): OmnigenOpenRpcExamplePairing {

    const transformedParams = it.params.map(param => this.assertRef(param, obj => this.toExample(undefined, obj)));
    const transformedResult = this.assertRef(it.result, obj => this.toExample(undefined, obj));

    const transformed = new OmnigenOpenRpcExamplePairing(it.name, transformedParams, transformedResult);
    transformed.params = it.params.map(item => {
      return this.assertRef(item, obj => this.toExample(undefined, obj));
    });

    transformed.result = this.assertRef(it.result, obj => this.toExample(undefined, obj));

    return transformed;
  }

  private toExample(key: string | undefined, it: OpenRpc.ExampleObject): OmnigenOpenRpcExample {

    const transformed = new OmnigenOpenRpcExample(it.name, it.value);
    transformed.description = it.description;
    transformed.summary = it.summary;

    return transformed;
  }

  private toLink(key: string | undefined, it: OpenRpc.LinkObject): OmnigenOpenRpcLink {

    const transformed = new OmnigenOpenRpcLink();
    transformed.name = it.name;
    transformed.description = it.description;
    transformed.method = it.method;
    transformed.summary = it.summary;
    transformed.params = it.params;
    transformed.server = it.server ? this.toLinkServer(it.server) : undefined;

    return transformed;
  }

  private toLinkServer(it: OpenRpc.LinkObjectServer): OmnigenOpenRpcLinkObjectServer {

    const transformed = new OmnigenOpenRpcLinkObjectServer(it.url);
    transformed.description = it.description;
    transformed.name = it.name;
    transformed.summary = it.summary;

    if (it.variables) {
      it.variables = {};
      for (const [key, value] of Object.entries(it.variables)) {
        it.variables[key] = this.toServerVariable(key, value);
      }
    }

    return transformed;
  }

  private toSchema(key: string, it: unknown): AnyJSONSchema {

    // lol
    return it as AnyJSONSchema;
  }

  private toTag(key: string | undefined, it: OpenRpc.TagObject): OmnigenOpenRpcTag {

    const transformed = new OmnigenOpenRpcTag(it.name);
    transformed.description = it.description;
    transformed.externalDocs = it.externalDocs ? this.toExternalDocs(it.externalDocs) : undefined;

    return transformed;
  }

  private toServerVariable(key: string, it: OpenRpc.ServerObjectVariable): OmnigenOpenRpcServerVariable {

    const transformed = new OmnigenOpenRpcServerVariable(it.default);
    transformed.description = it.description;
    transformed.enum = it.enum;

    return transformed;
  }

  private toContact(it: OpenRpc.ContactObject): OmnigenOpenRpcContact {

    const transformed = new OmnigenOpenRpcContact();
    transformed.name = it.name;
    transformed.email = it.email;
    transformed.url = it.url;

    return transformed;
  }

  private toLicense(it: OpenRpc.LicenseObject): OmnigenOpenRpcLicense {

    const transformed = new OmnigenOpenRpcLicense();
    transformed.name = it.name;
    transformed.url = it.url;

    return transformed;
  }

  private assertRef<T extends object, R>(it: T, onNormal: (obj: Exclude<T, { $ref: any }>) => R): R | OmnigenOpenRpcRef<R> {

    if ('$ref' in it) {
      return new OmnigenOpenRpcRef<R>(it.$ref as string);
    } else {
      return onNormal(it as any);
    }
  }
}
