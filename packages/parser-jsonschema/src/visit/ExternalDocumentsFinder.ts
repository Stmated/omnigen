import pointer, {JsonObject} from 'json-pointer';
import {getShallowPayloadString, ProtocolHandler, Util} from '@omnigen/core';
import {DocumentStore, JsonItemAbsoluteUri, JsonPathResolver, ObjectVisitor, PathItem} from '@omnigen/core-json';
import {JSONSchema9} from '../definitions';

export type WithoutRef<T> = T extends { $ref: string }
  ? Exclude<T, { $ref: string }>
  : T;

export interface RefResolver {
  resolve<const T>(value: T): WithoutRef<T>;
  /**
   * Only resolves if the value is a pure $ref, otherwise returns the original value. Will be up to the caller to do any merging.
   */
  resolveLossless<const T>(value: T): WithoutRef<T>;
  resolveMixed<const T>(value: T): WithoutRef<T>;
  getFirstResolved<const T, R>(value: T, mapper: (value: Partial<WithoutRef<T>>) => R | undefined): R | undefined;
}

type NewDocument = { uri: JsonItemAbsoluteUri, object: JsonObject };

export type DynamicAnchor = {
  documentUri: string;
  anchorName: string;
  jsonPath: string;
}

export class ExternalDocumentsFinder {

  private readonly _uri: string;
  private readonly _jsonSchema: JsonObject;

  private readonly _documents: DocumentStore;
  private readonly _anchors: DynamicAnchor[] = [];

  constructor(uri: string, jsonSchema: JsonObject, docStore?: DocumentStore) {
    this._uri = uri;
    this._jsonSchema = jsonSchema;
    this._documents = docStore ?? new DocumentStore();
  }

  get documents() {
    return this._documents.values();
  }

  create(): RefResolver {

    const rootUri = JsonPathResolver.toAbsoluteUriParts(undefined, this._uri);
    this._documents.set(rootUri.absoluteDocumentUri, this._jsonSchema);

    type QueueItem = { uri: JsonItemAbsoluteUri, schema: JsonObject };
    const queue: QueueItem[] = [];
    queue.push({uri: rootUri, schema: this._jsonSchema});

    for (let i = 0; i < 100; i++) {

      const item = queue.pop();
      if (!item) {
        break;
      }

      const newDocuments = ExternalDocumentsFinder.searchInto(item.schema, item.uri, this._documents, this._anchors);

      for (const newDocument of newDocuments) {
        const subSchema = newDocument.object as JSONSchema9;

        this._documents.set(newDocument.uri.absoluteDocumentUri, subSchema);
        queue.push({uri: newDocument.uri, schema: subSchema});
      }
    }

    return {
      resolve: v => {
        if (v && typeof v == 'object' && '$ref' in v && typeof v.$ref == 'string') {
          return this.resolveRef(v.$ref, v);
        }
        if (v && typeof v == 'object' && '$dynamicRef' in v && typeof v.$dynamicRef == 'string') {
          return this.resolveDynamicRef(v.$dynamicRef, v);
        }

        return v as WithoutRef<typeof v>;
      },
      resolveMixed: v => {
        if (v && typeof v == 'object' && '$ref' in v && typeof v.$ref == 'string' && Object.keys(v).length > 1) {
          return this.resolveRef(v.$ref, v);
        }
        if (v && typeof v == 'object' && '$dynamicRef' in v && typeof v.$dynamicRef == 'string' && Object.keys(v).length > 1) {
          return this.resolveDynamicRef(v.$dynamicRef, v);
        }

        return undefined; // as WithoutRef<typeof v>;
      },
      resolveLossless: v => {
        if (v && typeof v == 'object' && '$ref' in v && typeof v.$ref == 'string' && Object.keys(v).length === 1) {
          return this.resolveRef(v.$ref, v);
        }
        if (v && typeof v == 'object' && '$dynamicRef' in v && typeof v.$dynamicRef == 'string' && Object.keys(v).length === 1) {
          return this.resolveDynamicRef(v.$dynamicRef, v);
        }
        return v as WithoutRef<typeof v>;
      },
      getFirstResolved: (value, mapper) => {

        let v = value;
        do {

          const mapped = mapper(v as Partial<WithoutRef<typeof v>>);
          if (mapped !== undefined) {
            return mapped;
          }

          if (v && typeof v == 'object' && '$dynamicRef' in v && typeof v.$dynamicRef == 'string') {
            v = this.resolveDynamicRef(v.$dynamicRef, v);
          }

          if (v && typeof v == 'object' && '$ref' in v && typeof v.$ref == 'string') {
            v = this.resolveRef(v.$ref, v);
          }

        } while (v);

        return undefined;
      },
    };
  }

  private resolveRef<T>(ref: string, origin: T) {

    let uri = JsonPathResolver.toPartialUri(ref);
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

      const shallowPayloadString = getShallowPayloadString(origin);
      throw new Error(`Could not find element '${uri.path}' inside ${uri.documentUri}, referenced from resolved ${shallowPayloadString}: ${ex}`, {cause: ex});
    }

    if (!element) {
      throw new Error(`Could not find element '${uri.path}' inside ${uri.documentUri}`);
    }

    return element;
  }

  private resolveDynamicRef<T>(ref: string, origin: T) {

    const parts = /^#?(.+?)(?:@(.+))?$/.exec(ref);
    if (!parts || !parts[1]) {
      throw new Error(`Could not find the dynamic anchor name for ${ref}`);
    }

    const cleanRef = parts[1];
    const foundAnchors = this._anchors.filter(it => it.anchorName === cleanRef);

    if (foundAnchors.length > 1) {
      let qwe = 0;
    }

    // TODO: We should search for the most suitable anchor here rather than the first. Closest wins! Compare Json paths
    for (const foundAnchor of foundAnchors) {

      const schema = this._documents.get(foundAnchor.documentUri!);
      if (!schema) {
        throw new Error(`Could not find document ${foundAnchor.documentUri} for anchor ${foundAnchor.anchorName}`);
      }

      try {
        const element = pointer.get(schema, foundAnchor.jsonPath);
        if (element !== undefined) {
          return element;
        }
      } catch (ex) {

        const shallowPayloadString = getShallowPayloadString(origin);
        throw new Error(`Could not find element '${foundAnchor.jsonPath}' inside ${foundAnchor.documentUri}, referenced from resolved ${shallowPayloadString}: ${ex}`, {cause: ex});
      }
    }

    throw new Error(`Could not find any suitable dynamic anchor for '${cleanRef} (has ${foundAnchors.map(it => it.anchorName).join(', ')})`);
  }

  private static searchInto(
    schema: JsonObject,
    parentUri: JsonItemAbsoluteUri,
    documents: DocumentStore,
    anchors: DynamicAnchor[],
  ): NewDocument[] {

    const newDocuments: NewDocument[] = [];

    const visitor = new ObjectVisitor(args => {

      const path = args.path;
      const obj = args.obj;

      if (!(path.length > 0 && obj && typeof obj === 'string')) {
        return true;
      }

      if (path[path.length - 1] === '$ref') {
        args.replaceWith = ExternalDocumentsFinder.relativeRefToAbsolute(obj, parentUri, documents, newDocuments);
      } else if (path[path.length - 3] === 'discriminator' && path[path.length - 2] === 'mapping') {
        args.replaceWith = ExternalDocumentsFinder.relativeRefToAbsolute(obj, parentUri, documents, newDocuments);
      } else if (path[path.length - 1] === '$dynamicRef') {
        // We replace with an internal format so we can compare the different json paths without keeping track of the document location inside the parser.
        args.replaceWith = `${args.obj}@/${path.slice(0, -1).join('/')}`;
      } else if (path[path.length - 1] === '$dynamicAnchor') {

        const anchorName = String(args.obj);
        const stringPath = `/${path.slice(0, -1).map(it => String(it)).join('/')}`;
        anchors.push({anchorName: anchorName, jsonPath: stringPath, documentUri: parentUri.absoluteDocumentUri});

        // We replace with an internal format so we can compare the different json paths without keeping track of the document location inside the parser.
        args.replaceWith = `${args.obj}@/${path.slice(0, -1).join('/')}`;
      }

      return true;
    });

    visitor.visit(schema);

    return newDocuments;
  }

  // private static getRefKey(path: PathItem[]) {
  //   if (path[path.length - 1] === '$ref') {
  //     return '$ref';
  //   } else {
  //     if () {
  //       return path[path.length - 1];
  //     } else {
  //       return undefined;
  //     }
  //   }
  // }

  private static relativeRefToAbsolute(obj: string, parentUri: JsonItemAbsoluteUri, documents: DocumentStore, newDocuments: NewDocument[]): string {

    const absoluteUri = JsonPathResolver.toAbsoluteUriParts(parentUri, obj);

    if (!documents.has(absoluteUri.absoluteDocumentUri)) {

      const newDocument = newDocuments.find(it => (it.uri.absoluteDocumentUri === absoluteUri.absoluteDocumentUri));
      if (!newDocument) {

        let object: JsonObject;
        if (absoluteUri.protocol == 'file') {
          object = ProtocolHandler.file<JsonObject>(absoluteUri.absoluteDocumentUri);
        } else if (absoluteUri.protocol == 'http' || absoluteUri.protocol == 'https') {
          object = ProtocolHandler.http<JsonObject>(absoluteUri.absoluteDocumentUri);
        } else {
          throw new Error(`Unknown protocol ${absoluteUri.protocol}`);
        }

        newDocuments.push({uri: absoluteUri, object: object});
      }
    }

    // Replace RELATIVE $ref with ABSOLUTE $ref
    return absoluteUri.absoluteUri;
  }
}
