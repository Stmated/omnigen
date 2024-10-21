import pointer, {JsonObject} from 'json-pointer';
import {getShallowPayloadString, ProtocolHandler} from '@omnigen/core';
import {DocumentStore, JsonItemAbsoluteUri, JsonPathResolver, ObjectVisitor, PathItem} from '@omnigen/core-json';
import {JSONSchema9} from '../definitions';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export type WithoutRef<T> = T extends { $ref: string }
  ? Exclude<T, { $ref: string }>
  : T;

export interface RefResolver {
  resolve<const T>(value: T): WithoutRef<T>;
}

type NewDocument = { uri: JsonItemAbsoluteUri, object: JsonObject };
type DynamicAnchor = {
  anchorName: string;
  path: string;
  obj: object;
}

export class ExternalDocumentsFinder {

  private readonly _uri: string;
  private readonly _jsonSchema: JsonObject;

  private readonly _documents: DocumentStore;

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

      const newDocuments = ExternalDocumentsFinder.searchInto(item.schema, item.uri, this._documents);

      for (const newDocument of newDocuments) {

        // const awaited = await newDocument.promise;
        const subSchema = newDocument.object as JSONSchema9;

        this._documents.set(newDocument.uri.absoluteDocumentUri, subSchema);
        queue.push({uri: newDocument.uri, schema: subSchema});
      }
    }

    return {
      resolve: v => {

        const origin = v;
        let maxRecursion = 10;
        while (v && typeof v == 'object' && '$ref' in v && typeof v.$ref == 'string') {

          // TODO: All this code does not really belong here -- it should be somewhere else, with code that specifically one deals with the exploding of $ref (inline or not inline)
          if (maxRecursion-- <= 0) {
            throw new Error(`Encountered too much recursion when resolving $ref: ${v.$ref}`);
          }

          const resolved = this.resolveRef(v.$ref, origin);
          const keys = Object.keys(v);
          if (keys.length === 2 && '$id' in v) {

            // This object only contains $id and $ref, which makes it quite useless. Replace with the resolved.
            v = resolved;
          } else if (keys.length > 1) {

            // TODO: This is a hack to make types not be removed because of being inline by code that thinks a schema-inline allOf item should be a hidden/unnamed type.
            resolved['x-inline'] = false;

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

  private static searchInto(
    schema: JsonObject,
    parentUri: JsonItemAbsoluteUri,
    documents: DocumentStore,
  ): NewDocument[] {

    const newDocuments: NewDocument[] = [];

    const dynamicAnchorMap = new Map<string, DynamicAnchor[]>();
    const dynamicAnchorVisitor = new ObjectVisitor(args => {
      if (args.path[args.path.length - 2] === '$dynamicAnchor') {

        // TODO: Need to be able to access the parent objects, so we can save the correct object as the dynamicAnchor object.

        const anchorName = String(args.path[args.path.length - 1]);
        const stringPath = `${args.path.map(it => String(it)).join('/')}/`;

        let anchors = dynamicAnchorMap.get(anchorName);
        if (!anchors) {
          anchors = [];
          dynamicAnchorMap.set(anchorName, anchors);
        }

        anchors.push({anchorName: anchorName, path: stringPath, obj: args.obj});

        // dynamicAnchorMap.set(stringPath, {anchorName: anchorName, obj: args.obj});
      }

      return true;
    });
    dynamicAnchorVisitor.visit(schema);

    const dynamicRefMap = new Map<string, DynamicAnchor>();
    const dynamicRefVisitor = new ObjectVisitor(args => {
      if (args.path[args.path.length - 2] === '$dynamicRef') {
        let anchorName = String(args.path[args.path.length - 1]);
        if (anchorName.startsWith('#')) {
          anchorName = anchorName.substring(1);
        }

        const stringPath = `${args.path.map(it => String(it)).join('/')}/`;
        const anchors = dynamicAnchorMap.get(anchorName) ?? [];
        let anchor: DynamicAnchor | undefined = undefined;
        if (anchors.length == 1) {
          anchor = anchors[0];
        }

        // TODO: Find the closest $dynamicAnchor for this $dynamicRef, then figure out where to take it from there
        //        Figure something out :( :( :(
        const closestDynamicAnchor = '';

        if (!anchor) {
          throw new Error(`Could not find any $dynamicAnchor for '${anchorName}' for $dynamicRef`);
        }

        dynamicRefMap.set(stringPath, anchor);
      }

      return true;
    });
    dynamicRefVisitor.visit(schema);

    const visitor = new ObjectVisitor(args => {

      const path = args.path;
      const obj = args.obj;

      if (!(path.length > 0 && obj && typeof obj === 'string')) {
        return true;
      }

      // TODO: Add support for $dynamicAnchor and $dynamicRef
      // TODO: Perhaps separate this into different classes, one for making absolute ref only, et cetera

      if (ExternalDocumentsFinder.getRefKey(path)) {
        args.replaceWith = ExternalDocumentsFinder.relativeRefToAbsolute(obj, parentUri, documents, newDocuments);
        return true;
      }

      // TODO: Add each found $dynamicRef to a list of unresolved ones
      //        Record location and path
      //        Then after search through parents using path.slice(0, -1)
      //        Do not search for any $dynamicAnchor unless found a $dynamicRef
      //        Go onwards from there -- try to figure out how all this should work...

      if (path[path.length - 1] === '$dynamicAnchor') {
        const i = 0;
      }

      if (path[path.length - 1] === '$dynamicRef') {
        const i = 0;
      }

      return true;
    });

    visitor.visit(schema);

    return newDocuments;
  }

  private static getRefKey(path: PathItem[]) {
    return (path[path.length - 1] === '$ref')
      ? '$ref'
      : (path[path.length - 3] === 'discriminator' && path[path.length - 2] === 'mapping')
        ? path[path.length - 1]
        : undefined;
  }

  private static relativeRefToAbsolute(obj: string, parentUri: JsonItemAbsoluteUri, documents: DocumentStore, newDocuments: NewDocument[]): string {

    const absoluteUri = JsonPathResolver.toAbsoluteUriParts(parentUri, obj);

    if (!documents.has(absoluteUri.absoluteDocumentUri)) {

      const newDocument = newDocuments.find(it => (it.uri.absoluteDocumentUri === absoluteUri.absoluteDocumentUri));
      if (!newDocument) {

        let object: JsonObject; // Promise<JsonObject>;
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
