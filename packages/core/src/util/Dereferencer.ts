/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument */
import pointer, {JsonObject} from 'json-pointer';
import {ProtocolHandler} from './ProtocolHandler.js';
import * as deepmerge from 'deepmerge';
import * as path from 'path';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export type RefAware = { $ref: string };

export type Dereferenced<out T> = { obj: T, root: object, hash?: string | undefined, mix?: boolean | undefined; };

export type UriHash = { uri: string, hash: string };

interface RecordMap {
  [key: string]: Record<string, never>;
}

type ReduceMap = RecordMap & {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  '': Array<Record<string, never>>
};

type UriParts = {
  protocol: string | undefined;
  path: string;
}

export interface ProtocolResolver {
  fetch<R>(uri: string): Promise<R>;

  resolveUri(baseUri: string, uri: string): string;

  parent(uri: string): string;

  replace(parts: UriParts): UriParts;
}

class HttpProtocolResolver implements ProtocolResolver {

  private readonly _protocol: string;

  constructor(protocol: string) {
    this._protocol = protocol;
  }

  fetch<R>(uri: string): Promise<R> {
    return ProtocolHandler.http<R>(uri);
  }

  resolveUri(baseUri: string, uri: string): string {
    if (uri.indexOf(':') != -1) {
      // The URI is absolute.
      return uri;
    }

    return new URL(uri, baseUri).href;
  }

  parent(uri: string): string {
    const cleanedUri = uri.replace(/\/$/, '');
    const lastSlashIndex = cleanedUri.lastIndexOf('/');
    return (lastSlashIndex != -1)
      ? cleanedUri.substring(0, lastSlashIndex)
      : cleanedUri;
  }

  replace(parts: UriParts): UriParts {

    // If we have once stepped into the world of the web, we have to keep there.
    // So if a document fetched from http://site.com/a.json points to file:b.json, it becomes: http://site.com/b.json
    return {
      protocol: (parts.protocol == 'https') ? parts.protocol : this._protocol,
      path: parts.path,
    };
  }
}

/**
 * TODO: Try and rewrite this class so that no casts using "as" are used, instead fully generic
 */
export class Dereferencer<T> {

  private static readonly _FILE: ProtocolResolver = {
    fetch<R>(uri: string): Promise<R> {
      return ProtocolHandler.file<R>(uri);
    },
    resolveUri(baseUri: string, uri: string): string {
      if (uri.startsWith('/')) {
        // The URI is absolute.
        return uri;
      }
      return path.resolve(baseUri, uri);
    },
    parent(uri: string): string {
      return path.dirname(path.resolve(uri));
    },
    replace(parts: UriParts): UriParts {
      return parts;
    },
  };

  private static readonly _HTTP = new HttpProtocolResolver('http');
  private static readonly _HTTPS = new HttpProtocolResolver('https');

  private static readonly _PROTOCOL_RESOLVERS = new Map<string, ProtocolResolver>();

  static {
    Dereferencer._PROTOCOL_RESOLVERS.set('file', Dereferencer._FILE);
    Dereferencer._PROTOCOL_RESOLVERS.set('http', Dereferencer._HTTP);
    Dereferencer._PROTOCOL_RESOLVERS.set('https', Dereferencer._HTTPS);
  }

  public static async create<T extends object>(baseUri: string, fileUri: string, root?: T): Promise<Dereferencer<T>> {

    const protocolIndex = baseUri?.indexOf(':') || -1;
    const defaultProtocolResolver = (baseUri && protocolIndex != -1)
      ? Dereferencer._PROTOCOL_RESOLVERS.get(baseUri.substring(0, protocolIndex).toLowerCase()) || Dereferencer._FILE
      : Dereferencer._FILE; // The default protocol handler if none is set

    if (!root) {

      // There is no root object.
      // We will assume that the the uri is the absolute path of the root.
      root = await defaultProtocolResolver.fetch<T>(fileUri);
    }

    const traverser = new Dereferencer<T>(root);
    traverser._documents.set(fileUri, root);

    // Start pre-loading the document so that the traversal can be done synchronously.
    return traverser.preLoad(baseUri, fileUri, root, defaultProtocolResolver, [])
      .then(() => traverser);
  }

  private readonly _root: T;

  /**
   * Save external documents as promise while resolving,
   * then replace them with the actual object so we can get nice call stacks while debugging.
   */
  private readonly _documents = new Map<string, JsonObject | Promise<JsonObject>>();

  private readonly _foundMixedRefs = new Set<string>();

  private constructor(root: T) {
    this._root = root;
  }

  public getFirstRoot(): T {
    return this._root;
  }

  private async preLoad(
    absoluteBaseUri: string,
    absoluteFileUri: string,
    obj: object,
    previousResolver: ProtocolResolver,
    callstack: string[],
  ): Promise<void> {

    if (callstack.length > 50) {
      throw new Error(`Loading too deep: ${callstack.join('\n')}`);
    }

    for (const e of Object.entries(obj)) {
      const key = e[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = e[1];
      if (key == '$ref') {

        if (typeof value === 'string') {
          const pointerParts = this.getPointerParts(value);
          if (pointerParts.uri) {

            // There is an URI given, so the ref might be in another document.
            const uriParts = this.getUriParts(previousResolver, pointerParts.uri);
            const resolver = this.getProtocolResolver(uriParts, previousResolver);
            const absoluteUri = this.getAbsoluteUri(resolver, uriParts, absoluteBaseUri);
            const absoluteUriDir = path.dirname(absoluteUri);

            const newRef = absoluteUri + '#' + pointerParts.hash;

            // We replace the $ref with an absolute ref, so it is easier to traverse later.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            obj[key] = newRef;

            // We cache the promises for the document
            const documentOrPromise = this._documents.get(absoluteUri);
            if (documentOrPromise && !(documentOrPromise instanceof Promise)) {
              // The document is cached and resolved, so it is already done.
              // await this.preLoad(absoluteUriDir, absoluteUri, documentOrPromise, resolver, callstack.concat([`cached ${key}: ${newRef}`]));
            } else if (documentOrPromise) {
              // The document is a promise. We will wait for it to finish, but do nothing.
              await documentOrPromise.then(() => {
                // this._documents.set(absoluteUri, doc);
                // return this.preLoad(absoluteUriDir, absoluteUri, doc, resolver, callstack.concat(['awaited ${key}: ${newRef}']))
              });
            } else {
              // This is a new external document. Fetch and cache and handle.
              const promise = resolver.fetch<object>(absoluteUri);
              this._documents.set(absoluteUri, promise);
              await promise.then(doc => {
                this._documents.set(absoluteUri, doc);
                return this.preLoad(absoluteUriDir, absoluteUri, doc, resolver, callstack.concat([`new ${key}: ${newRef}`]));
              });
            }
          } else {

            // Replace the ref with an absolute uri if none is used.
            // This makes it easier to traverse the document later, and things are moved around.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            obj[key] = absoluteFileUri + '#' + pointerParts.hash;
          }
        } else {
          throw new Error(`The ref value must be a string`);
        }
      } else if (value && typeof value === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await this.preLoad(absoluteBaseUri, absoluteFileUri, value, previousResolver, callstack.concat([key]));
      } else {
        // This is an edge node, no need to go any further
      }
    }
  }

  public get<R>(given: RefAware | R, root: JsonObject): Dereferenced<R> {

    if (typeof given == 'object' && given && '$ref' in given) {
      return this.getFromRef<R>(given.$ref, given, root);
    } else {
      return {
        obj: given,
        hash: undefined,
        root: root,
        mix: false,
      };
    }
  }

  public getFromRef<R>(ref: string, given: RefAware | undefined, root: JsonObject): Dereferenced<R> {
    const parts = this.getPointerParts(ref);

    if (parts.uri.length > 0) {
      const externalDocument = this._documents.get(parts.uri);
      if (!externalDocument || externalDocument instanceof Promise) {
        throw new Error(`There is no document cached for '${parts.uri}`);
      }

      return this.resolveJsonPointer(given, externalDocument, parts.hash);
    } else {
      return this.resolveJsonPointer<RefAware, R>(given, root, parts.hash);
    }
  }

  private getPointerParts(ref: string): UriHash {
    const refParts = ref.split('#');
    if (refParts.length < 2) {
      throw new Error(`The ref uri must contain a hash (#) character`);
    }

    return {
      uri: refParts[0],
      hash: refParts[1],
    };
  }

  private getAbsoluteUri(protocolResolver: ProtocolResolver, uri: UriParts, baseUri: string): string {
    return baseUri ? protocolResolver.resolveUri(baseUri, uri.path) : uri.path;
  }

  private getProtocolResolver(uri: UriParts, current: ProtocolResolver): ProtocolResolver {
    const protocolResolver = uri.protocol
      ? Dereferencer._PROTOCOL_RESOLVERS.get(uri.protocol)
      : current;

    if (!protocolResolver) {
      throw new Error(`There is no protocol resolver registered for '${uri.protocol || uri.path}'`);
    }

    return protocolResolver;
  }

  private getUriParts(protocolResolver: ProtocolResolver, refUri: string): UriParts {

    const protocolIndex = refUri.indexOf(':');
    return protocolResolver.replace({
      protocol: (protocolIndex != -1) ? refUri.substring(0, protocolIndex).toLowerCase() : undefined,
      path: (protocolIndex != -1) ? refUri.substring(protocolIndex + 1) : refUri,
    });
  }

  private resolveJsonPointer<T extends RefAware, R>(given: T | undefined, root: object, path: string): Dereferenced<R> {

    let resolvedObject: RefAware | R;
    if (path == '') {
      // Pretty dangerous, but it is up to the spec writer to be correct.
      resolvedObject = root as unknown as R;
    } else {
      try {
        resolvedObject = pointer.get(root, path) as R | RefAware;
      } catch (ex) {
        throw new Error(`Could not resolve '${path}': ${String(ex)}`, {cause: (ex instanceof Error ? ex : undefined)});
      }
    }

    let wasMixed = false;
    if (given) {

      // The given object might have $ref AND extra properties.
      // So we might need to mix the given object and the resolved object together.
      // NOTE: This should be an option and not always done. Strict/Lenient option.
      const beforeMix = resolvedObject;
      const mixed = this.mix<R>(given, beforeMix);
      resolvedObject = mixed[0];

      // This means that the JSONSchema is actually invalid, but we want to be helpful.
      // It means there was a $ref property *and* other properties.
      // The specification disallows this, but it is way too useful to not allow.
      // There are also specifications out there on the Internet that use this trick.
      wasMixed = mixed[1];
    }

    if (typeof resolvedObject == 'object' && resolvedObject && '$ref' in resolvedObject) {

      // There are nested $ref, so we need to dive deeper.
      // NOTE: It should be an option for if we want to dive recursively.
      return this.get<R>(resolvedObject, root);
    } else {

      return {
        obj: resolvedObject,
        hash: path,
        root: root,
        mix: wasMixed,
      };
    }
  }

  private static emptyTarget(val: unknown): Partial<[] | Record<string, never>> {
    return Array.isArray(val) ? [] : {};
  }

  private static reduceArrayToIdMap(map: ReduceMap, obj: Record<string, never>): ReduceMap {

    // If the items all contain 'name', 'id' or $id, we should merge and replace those respective items
    const id = obj['$id'] || obj['id'] || obj['name'];
    if (id) {
      map[id] = obj;
    } else {
      map[''].push(obj);
    }

    return map;
  }

  private static readonly _MERGE_OPTIONS: deepmerge.Options = {

    arrayMerge: (source, target, options) => {

      const namedSource: ReduceMap = source.reduce((map, obj) => Dereferencer.reduceArrayToIdMap(map, obj), {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '': []
      });
      const namedTarget: ReduceMap = target.reduce((map, obj) => Dereferencer.reduceArrayToIdMap(map, obj), {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '': []
      });

      const replacements: any[] = [];
      for (const key of Object.keys(namedSource)) {
        if (key.length > 0) {
          if (!namedTarget[key]) {
            replacements.push(namedSource[key]);
          } else {
            // Other takes precedence
          }
        }
      }

      for (const key of Object.keys(namedTarget)) {
        if (key.length > 0) {
          replacements.push(namedTarget[key]);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return replacements.concat(namedTarget['']).concat(namedSource['']).map((element: any) => {

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (options?.clone !== false && options && options?.isMergeableObject(element)) {
          const emptyTarget = Dereferencer.emptyTarget(element);
          return deepmerge.default(emptyTarget, element, options);
        } else {
          return element;
        }
      });
    },
  };

  private mix<R>(object: RefAware, resolved: Partial<R | RefAware>): [R | RefAware, boolean] {

    const keys = Object.keys(object);
    if (keys.length <= 1) {
      // NOTE: The cast to R here is not correct, but for now we do not care. The generics should improve someday.
      return [resolved as R, false];
    }

    const copy = {...object};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete (copy as never)['$ref'];

    // Report the ref to the key we encountered, so we can log about it after the processing is done (to lessen logs)
    if (!this._foundMixedRefs.has(object.$ref)) {

      this._foundMixedRefs.add(object.$ref);

      const extraKeys = keys.filter(it => (it != '$ref'));
      logger.warn(`Extra keys with $ref ${object.$ref} (${extraKeys.join(', ')}). This is INVALID spec. We allow and merge`);
    }

    const merged = deepmerge.default(resolved, copy, Dereferencer._MERGE_OPTIONS);

    return [merged, true];
  }
}
