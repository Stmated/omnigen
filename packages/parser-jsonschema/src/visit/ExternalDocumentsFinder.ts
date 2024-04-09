import nodePath from 'path';
import pointer, {JsonObject} from 'json-pointer';
import {isDefined, ProtocolHandler, Util} from '@omnigen/core-util';
import {ObjectReducer} from '@omnigen/core-json';
import {JSONSchema9} from '../definitions';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

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
        let maxRecursion = 10;
        while (v && typeof v == 'object' && '$ref' in v && typeof v.$ref == 'string') {

          if (maxRecursion-- <= 0) {
            throw new Error(`Encountered too much recursion when resolving $ref: ${v.$ref}`);
          }

          const resolved = this.resolveRef(v.$ref, origin);
          const keys = Object.keys(v);
          if (keys.length == 2 && '$id' in v) {

            // This object only contains $id and $ref, which makes it quite useless. Replace with the resolved.
            v = resolved;
          } else if (keys.length > 1) {

            delete v.$ref;
            if ('allOf' in v) {
              (v as any).allOf.push(resolved);
            } else {
              (v as any).allOf = [resolved];
            }

          } else {

            // The only key is the $ref, so there is no need to spend time merging.
            v = resolved;
          }
        }

        return v as WithoutRef<typeof v>;
      },
    };
  }

  private resolveRef<T>(ref: string, origin: T) {

    let uri = ExternalDocumentsFinder.toPartialUri(ref);
    if (!uri.documentUri) {
      uri = {
        ...uri,
        documentUri: this._uri,
      };
    }

    const schema = this._documents.get(uri.documentUri!);

    if (!schema) {
      throw new Error(`Could not find ${ref}, expected in uri '${uri.documentUri}', it must be pre-loaded`);
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

    return element;
  }

  private static searchInto(schema: JsonObject, parentUri: JsonItemAbsoluteUri, documents: Map<string, JsonObject>) {

    type NewDocument = { uri: JsonItemAbsoluteUri, promise: Promise<JsonObject> };
    const newDocuments: NewDocument[] = [];

    const walker = new ObjectReducer(schema);
    walker.walk((obj, path) => {

      if (!(path.length > 0 && obj && typeof obj === 'string')) {
        return obj;
      }

      const refKey = (path[path.length - 1] === '$ref')
        ? '$ref'
        : (path[path.length - 3] === 'discriminator' && path[path.length - 2] === 'mapping')
          ? path[path.length - 1]
          : undefined;

      if (!refKey) {
        return obj;
      }

      if (refKey !== '$ref') {
        logger.info(`--- Loading and resolving relative custom $ref: ${refKey}: ${obj}`);
      }

      const absoluteUri = ExternalDocumentsFinder.toAbsoluteUriParts(parentUri, obj);

      if (!documents.has(absoluteUri.absoluteDocumentUri)) {

        const newDocument = newDocuments.find(it => (it.uri.absoluteDocumentUri === absoluteUri.absoluteDocumentUri));
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

      // Replace RELATIVE $ref with ABSOLUTE $ref
      return absoluteUri.absoluteUri;
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
