import nodePath from 'path';
import pointer, {JsonObject} from 'json-pointer';
import {isDefined, ProtocolHandler, Util} from '@omnigen/core-util';
import {SimpleObjectWalker} from './helpers.ts';
import {JSONSchema9} from '../definitions';

export type WithoutRef<T> = T extends { $ref: string }
  ? Exclude<T, { $ref: string }>
  : T;

export interface RefResolver {
  resolve<const T>(value: T): WithoutRef<T>;
}

type Protocols = 'https' | 'http' | 'file';

export interface JsonItemAbsoluteUri {
  protocol: Protocols;
  absoluteDocumentUri: string;
  absoluteUri: string;
  path: string[];
}

export interface JsonItemPartialUri {
  protocol?: Protocols | undefined;
  documentUri?: string | undefined;
  path?: string | undefined;
}

export class ExternalDocumentsFinder {

  private readonly _uri: string;
  private readonly _jsonSchema: JsonObject;

  private readonly _documents = new Map<string, JsonObject>();

  constructor(uri: string, jsonSchema: JsonObject) {
    this._uri = uri;
    this._jsonSchema = jsonSchema;
  }

  get documents() {
    return this._documents.values();
  }

  async create(): Promise<RefResolver> {

    const rootUri = ExternalDocumentsFinder.toAbsoluteUriParts(undefined, this._uri);
    this._documents.set(rootUri.absoluteDocumentUri, this._jsonSchema);

    type QueueItem = { uri: JsonItemAbsoluteUri, schema: JsonObject };
    const queue: QueueItem[] = [];
    queue.push({uri: rootUri, schema: this._jsonSchema});

    for (let i = 0; i < 100; i++) {

      const item = queue.pop();
      if (!item) {
        break;
      }

      const newDocuments = ExternalDocumentsFinder.searchInto(item.schema, item.uri, this._documents);

      for (const newDocument of newDocuments) {

        const awaited = await newDocument.promise;
        const subSchema = awaited as JSONSchema9;

        this._documents.set(newDocument.uri.absoluteDocumentUri, subSchema);
        queue.push({uri: newDocument.uri, schema: subSchema});
      }
    }

    return {
      resolve: v => {

        const origin = v;
        while (v && typeof v == 'object' && '$ref' in v && typeof v.$ref == 'string') {

          let uri = ExternalDocumentsFinder.toPartialUri(v.$ref);
          if (!uri.documentUri) {
            uri = {
              ...uri,
              documentUri: this._uri,
            };
          }

          const schema = this._documents.get(uri.documentUri!);

          if (!schema) {
            throw new Error(`Could not find ${v.$ref}, expected in uri '${uri.documentUri}', it must be pre-loaded`);
          }

          let element: any;
          try {
            element = uri.path ? pointer.get(schema, uri.path) : schema;
          } catch (ex) {

            const shallowPayloadString = Util.getShallowPayloadString(origin);
            throw new Error(`Could not find element '${uri.path}' inside ${uri.documentUri}, referenced from resolved ${shallowPayloadString}: ${ex}`, {cause: ex});
          }

          if (!element) {
            throw new Error(`Could not find element '${uri.path}' inside ${uri.documentUri}`);
          }

          v = element;
        }

        return v as WithoutRef<typeof v>;
      },
    };
  }

  private static searchInto(schema: JsonObject, parentUri: JsonItemAbsoluteUri, documents: Map<string, JsonObject>) {

    // const newDocuments = new Map<JsonItemAbsoluteUri, Promise<JsonObject>>();
    type NewDocument = { uri: JsonItemAbsoluteUri, promise: Promise<JsonObject> };
    const newDocuments: NewDocument[] = [];

    const walker = new SimpleObjectWalker(schema);
    walker.walk((obj, path) => {

      if (path.length > 0 && path[path.length - 1] == '$ref' && obj && typeof obj == 'string') {

        const absoluteUri = ExternalDocumentsFinder.toAbsoluteUriParts(parentUri, obj);

        if (!documents.has(absoluteUri.absoluteDocumentUri)) {

          const newDocument = newDocuments.find(it => it.uri.absoluteDocumentUri == absoluteUri.absoluteDocumentUri);
          if (!newDocument) {

            let promise: Promise<JsonObject>;
            if (absoluteUri.protocol == 'file') {
              promise = ProtocolHandler.file<JsonObject>(absoluteUri.absoluteDocumentUri);
            } else if (absoluteUri.protocol == 'http' || absoluteUri.protocol == 'https') {
              promise = ProtocolHandler.http<JsonObject>(absoluteUri.absoluteDocumentUri);
            } else {
              throw new Error(`Unknown protocol ${absoluteUri.protocol}`);
            }

            newDocuments.push({uri: absoluteUri, promise: promise});
          }
        }

        // Replace with the absolute uri
        return absoluteUri.absoluteUri;
      }

      return obj;
    });

    return newDocuments;
  }

  static toPartialUri(uriString: string): Readonly<JsonItemPartialUri> {

    const protocolIndex = uriString.indexOf(':');
    const hashIndex = uriString.indexOf('#');

    const protocol = (protocolIndex != -1) ? uriString.substring(0, protocolIndex).toLowerCase() : undefined;

    let documentUri = uriString;
    if (hashIndex != -1) {
      documentUri = documentUri.substring(0, hashIndex);
    }
    if (protocolIndex != -1 && protocol == 'file') {
      // Remove the "file:" part of the document uri for files
      documentUri = documentUri.substring(protocolIndex + 1);
    }

    if (protocol != 'https' && protocol != 'http' && protocol != 'file' && protocol != undefined) {
      throw new Error(`Unknown protocol ${protocol}`);
    }

    const path = (hashIndex != -1) ? uriString.substring(hashIndex + 1) : undefined;

    return {
      protocol: protocol,
      documentUri: documentUri.length > 0 ? documentUri : undefined,
      path: path,
    };
  }

  static toAbsoluteUriParts(parent: JsonItemAbsoluteUri | undefined, uriString: string): Readonly<JsonItemAbsoluteUri> {

    const uri = ExternalDocumentsFinder.toPartialUri(uriString);

    const hashPath = uri.path ? uri.path.split('/').filter(isDefined) : [];
    const hashSuffix = hashPath.length > 0 ? `#${uri.path}` : '';

    if (uri.protocol == 'http' || uri.protocol == 'https') {

      if (!uri.documentUri) {
        throw new Error(`Must give the URL to the document for ${uriString}`);
      }

      return {
        protocol: uri.protocol,
        absoluteDocumentUri: uri.documentUri,
        absoluteUri: `${uri.protocol}://${uri.documentUri}${hashSuffix}`,
        path: hashPath,
      };
    }

    if (!parent) {

      if (!uri.documentUri) {
        throw new Error(`Must give the file path to the document for ${uriString}`);
      }

      const absoluteFilePath = nodePath.resolve(uri.documentUri);
      const protocol = uri.protocol ?? 'file';

      return {
        protocol: protocol,
        absoluteDocumentUri: absoluteFilePath,
        absoluteUri: `${protocol}:${absoluteFilePath}${hashSuffix}`,
        path: hashPath,
      };
    } else {

      if (parent.protocol == 'http' || parent.protocol == 'https') {

        const resolvedUrl = uri.documentUri ? new URL(uri.documentUri, parent.absoluteDocumentUri).href : parent.absoluteDocumentUri;

        // If we've gone online once, then we need to keep being there.
        return {
          protocol: parent.protocol,
          absoluteDocumentUri: resolvedUrl,
          absoluteUri: `${resolvedUrl}${hashSuffix}`,
          path: hashPath,
        };
      } else {

        const absoluteFilePath = uri.documentUri
          ? nodePath.resolve(nodePath.dirname(parent.absoluteDocumentUri), uri.documentUri)
          : parent.absoluteDocumentUri;

        const protocol = uri.protocol ?? parent.protocol;

        return {
          protocol: protocol,
          absoluteDocumentUri: absoluteFilePath,
          absoluteUri: `${protocol}:${absoluteFilePath}${hashSuffix}`,
          path: hashPath,
        };
      }
    }
  }
}
