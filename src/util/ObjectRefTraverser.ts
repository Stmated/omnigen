import pointer, {JsonObject} from 'json-pointer';
import * as path from 'path';
import {ProtocolHandler} from '@util/ProtocolHandler';

export interface RefAware {
  $ref: string;
}

export type TraverseResult<T> = (obj: T, hash: string | undefined) => void;

export type TraverseCallback<T> = (obj: T, hash: string | undefined, error?: Error) => void;
export type ErrorCallback = (error: Error) => void;

export interface ProtocolResolver {
  resolve<R>(uri: string): Promise<R>;
}

export class ObjectRefTraverser {

  private readonly _protocolResolvers = new Map<string, ProtocolResolver>();

  /**
   * This stack will be pushed and popped depending on which document we are currently inside.
   */
  private readonly _baseUriStack: string[] = [];
  private readonly _documentStack: unknown[] = [];
  private readonly _documentPromises = new Map<string, Promise<unknown>>();

  constructor(root: unknown, baseUri?: string) {

    this._protocolResolvers.set('file', {
      resolve<R>(uri: string): Promise<R> {
        return ProtocolHandler.file<R>(uri);
      }
    });
    this._protocolResolvers.set('http', {
      resolve<R>(uri: string): Promise<R> {
        return ProtocolHandler.http<R>(uri);
      }
    });
    this._protocolResolvers.set('https', {
      resolve<R>(uri: string): Promise<R> {
        return ProtocolHandler.http<R>(uri);
      }
    });

    this._documentStack.push(root);

    if (baseUri) {
      this._baseUriStack.push(baseUri);
    }
  }

  public traverse<T>(obj: T | RefAware, callback: TraverseCallback<T>, error: ErrorCallback): void {

    if ('$ref' in obj) {

      const uriParts = obj.$ref.split('#');
      if (uriParts.length < 2) {
        throw new Error(`The ref uri must contain a hash (#) character`);
      }

      const uri = uriParts[0];
      const hash = uriParts[1];

      if (uri.length > 0) {

        const protocolIndex = uri.indexOf(':');
        const protocol = (protocolIndex != -1)
          ? uri.substring(0, protocolIndex).toLowerCase()
          : 'file';

        const protocolUri = (protocolIndex != -1)
          ? uri.substring(protocolIndex + 1)
          : uri;

        const protocolHandler = this._protocolResolvers.get(protocol);
        if (!protocolHandler) {
          throw new Error(`There is no protocol handler registered for '${protocol}'`);
        }

        const baseUri = this.getBaseUri();
        const absoluteUri = baseUri
          ? `${baseUri}/${protocolUri}` // TODO: This is incorrect, is not the same for all protocols
          : protocolUri;

        // We cache the promises for the document
        let documentPromise = this._documentPromises.get(absoluteUri);
        if (!documentPromise) {
          documentPromise = protocolHandler.resolve<T>(absoluteUri);
          this._documentPromises.set(absoluteUri, documentPromise);
        }

        // TODO: Need to check for recursion
        documentPromise
          .then(externalDocument => {
              const docObject = this.get<T>(externalDocument, hash);
              this.wrap(externalDocument, absoluteUri, docObject, hash, callback);
            },
            ex => {
              error(ex instanceof Error ? ex : new Error(`Could not get external document at ${absoluteUri}`));
            });
      } else {

        // TODO: Need to cache the pointer get for this document/baseUri?
        const docObject = this.get<T>(this.getDocument(), hash);
        this.wrap(undefined, undefined, docObject, hash, callback);
      }
    } else {
      this.wrap(undefined, undefined, obj, undefined, callback);
    }
  }

  private wrap<T>(doc: unknown | undefined, docUri: string | undefined, docObject: T, ref: string | undefined, callback: TraverseCallback<T>): void {

    if (doc) {
      this._documentStack.push(doc);
    }
    if (docUri) {
      this._baseUriStack.push(docUri);
    }

    callback(docObject, ref);

    if (doc) {
      const poppedDoc = this._documentStack.pop();
      if (poppedDoc !== doc) {
        throw new Error(`The popped document is not the same as the recently pushed one`);
      }
    }
    if (docUri) {
      const poppedDocUri = this._baseUriStack.pop();
      if (poppedDocUri !== docUri) {
        throw new Error(`The popped document uri is not the same as the recently pushed one`);
      }
    }
  }

  private get<R>(doc: unknown, path: string): R {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    return pointer.get(doc as JsonObject, path) as R;
  }

  private getDocument(): unknown {
    if (this._documentStack.length == 0) {
      throw new Error(`There must be a root document set`);
    }

    return this._documentStack[this._documentStack.length - 1];
  }

  private getBaseUri(): string | undefined {
    if (this._baseUriStack.length == 0) {
      return undefined;
    }

    return this._baseUriStack[this._baseUriStack.length - 1];
  }
}
