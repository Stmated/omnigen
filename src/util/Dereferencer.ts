import pointer, {JsonObject} from 'json-pointer';
import {ProtocolHandler} from '@util/ProtocolHandler';
import {LoggerFactory} from '@util/LoggerFactory';
import * as path from 'path';

const logger = LoggerFactory.create(__filename);

export type RefAware = {$ref: string};

export type Dereferenced<out T> = { obj: T, root: object, hash?: string };

export type UriHash = {uri: string, hash: string};

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

export class Dereferencer<T> {

  private static readonly file: ProtocolResolver = {
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
    }
  };

  private static readonly http = new HttpProtocolResolver('http');
  private static readonly https = new HttpProtocolResolver('https');

  private static readonly PROTOCOL_RESOLVERS = new Map<string, ProtocolResolver>();

  static {
    Dereferencer.PROTOCOL_RESOLVERS.set('file', Dereferencer.file);
    Dereferencer.PROTOCOL_RESOLVERS.set('http', Dereferencer.http);
    Dereferencer.PROTOCOL_RESOLVERS.set('https', Dereferencer.https);
  }

  public static async create<T extends object>(uri: string, root?: T): Promise<Dereferencer<T>> {

    const protocolIndex = uri?.indexOf(':') || -1;
    const defaultProtocolResolver = (uri && protocolIndex != -1)
      ? Dereferencer.PROTOCOL_RESOLVERS.get(uri.substring(0, protocolIndex).toLowerCase()) || Dereferencer.file
      : Dereferencer.file; // The default protocol handler if none is set

    if (!root) {

      // There is no root object.
      // We will assume that the the uri is the absolute path of the root.
      root = await defaultProtocolResolver.fetch<T>(uri);
    }

    const traverser = new Dereferencer<T>(root);

    // Start pre-loading the document so that the traversal can be done synchronously.
    return traverser.preLoad(uri, root, defaultProtocolResolver)
      .then(() => traverser);
  }

  private readonly _root: T;

  /**
   * Save external documents as promise while resolving,
   * then replace them with the actual object so we can get nice call stacks while debugging.
   */
  private readonly _documents = new Map<string, JsonObject | Promise<JsonObject>>();

  private constructor(root: T) {
    // Private constructor
    this._root = root;
  }

  public getFirstRoot(): T {
    return this._root;
  }

  private async preLoad(absoluteBaseUri: string, obj: object, previousResolver: ProtocolResolver): Promise<void> {
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

            // We replace the $ref with an absolute ref, so it is easier to traverse later.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            obj[key] = absoluteUri + '#' + pointerParts.hash;

            // We cache the promises for the document
            const documentOrPromise = this._documents.get(absoluteUri);
            if (documentOrPromise && !(documentOrPromise instanceof Promise)) {
              // The document is cached and resolved, so we simply handle it.
              await this.preLoad(absoluteUriDir, documentOrPromise, resolver);
            } else if (documentOrPromise) {
              // The document is a promise, and we should wait for it and continue.
              await documentOrPromise.then(doc => {
                this._documents.set(absoluteUri, doc);
                return this.preLoad(absoluteUriDir, doc, resolver)
              });
            } else {
              // This is a new external document. Fetch and cache and handle.
              const promise = resolver.fetch<object>(absoluteUri);
              this._documents.set(absoluteUri, promise);
              await promise.then(doc => {
                this._documents.set(absoluteUri, doc);
                return this.preLoad(absoluteUriDir, doc, resolver);
              });
            }
          }
        } else {
          throw new Error(`The ref value must be a string`);
        }
      } else if (value && typeof value === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await this.preLoad(absoluteBaseUri, value, previousResolver);
      } else {
        // This is an edge node, no need to go any further
      }
    }
  }

  public get<R>(given: RefAware | R, root: JsonObject): Dereferenced<R> {

    if ('$ref' in given) {
      const parts = this.getPointerParts(given.$ref);

      if (parts.uri.length > 0) {
        const externalDocument = this._documents.get(parts.uri);
        if (!externalDocument || externalDocument instanceof Promise) {
          throw new Error(`There is no document cached for '${parts.uri}`);
        }

        return this.resolveJsonPointer(given, externalDocument, parts.hash);
      } else {
        return this.resolveJsonPointer<R>(given, root, parts.hash);
      }
    } else {
      return {
        obj: given,
        hash: undefined,
        root: root,
      };
    }
  }

  private getPointerParts(ref: string): UriHash {
    const refParts = ref.split('#');
    if (refParts.length < 2) {
      throw new Error(`The ref uri must contain a hash (#) character`);
    }

    return {
      uri: refParts[0],
      hash: refParts[1]
    };
  }

  private getAbsoluteUri(protocolResolver: ProtocolResolver, uri: UriParts, baseUri: string): string {
    return baseUri ? protocolResolver.resolveUri(baseUri, uri.path) : uri.path;
  }

  private getProtocolResolver(uri: UriParts, current: ProtocolResolver): ProtocolResolver {
    const protocolResolver = uri.protocol
      ? Dereferencer.PROTOCOL_RESOLVERS.get(uri.protocol)
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

  private resolveJsonPointer<R>(given: RefAware, root: object, path: string): Dereferenced<R> {

    // TODO: Allow "" and relative paths based on the "given" object as root?
    // const used = (parts.hash.startsWith('/'))
    //   ? root // this._objectStack[this._objectStack.length - 1] // root
    //   : given;

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

    if (given) {

      // The given object might have $ref AND extra properties.
      // So we might need to mix the given object and the resolved object together.
      // NOTE: This should be an option and not always done. Strict/Lenient option.
      resolvedObject = this.mix<R>(given, resolvedObject);
    }

    if (typeof resolvedObject == 'object' && '$ref' in resolvedObject) {

      // There are nested $ref, so we need to dive deeper.
      // NOTE: It should be an option for if we want to dive recursively.
      return this.get<R>(resolvedObject, root);
    } else {

      return {
        obj: resolvedObject,
        hash: path,
        root: root,
      };
    }
  }

  private mix<R>(object: RefAware, resolved: R | RefAware): R | RefAware {

    const keys = Object.keys(object);
    if (keys.length > 1) {

      const extraKeys = keys.filter(it => (it != '$ref'));
      const copy = {...object};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete (copy as never)['$ref'];
      logger.warn(`Extra keys with $ref ${object.$ref} (${extraKeys.join(', ')}). This is INVALID spec. We allow and merge`);

      // TODO: Use Object.assign instead?
      // TODO: What to do if the property exists in both?
      resolved = {...resolved, ...copy};
    }

    return resolved;
  }
}
