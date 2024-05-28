import fetch from 'sync-fetch';
import fs from 'fs';
import {JsonItemAbsoluteUri} from './JsonPathResolver.ts';
import pointer, {JsonObject} from 'json-pointer';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export class DocumentStore {
  public readonly documents = new Map<string, JsonObject>();
}

export class JsonPathFetcher {

  public static get(path: JsonItemAbsoluteUri, store?: DocumentStore): JsonObject | undefined {

    const jsonPath = `/${path.path.join('/')}`;

    let document = store ? store.documents.get(path.absoluteDocumentUri) : undefined;
    if (document) {
      logger.silent(`Has cached document '${path.absoluteDocumentUri}', will get path '${jsonPath}'`);
      return pointer.has(document, jsonPath) ? pointer.get(document, jsonPath) : undefined;
    }

    logger.silent(`Loading document '${path.absoluteDocumentUri}'`);
    if (path.protocol == 'file') {
      document = JsonPathFetcher.file<JsonObject>(path.absoluteDocumentUri);
    } else if (path.protocol == 'http' || path.protocol == 'https') {
      document = JsonPathFetcher.http<JsonObject>(path.absoluteDocumentUri);
    } else {
      throw new Error(`Unknown protocol ${path.protocol}`);
    }

    if (store) {
      store.documents.set(path.absoluteDocumentUri, document);
    }

    const has = pointer.has(document, jsonPath);
    logger.silent(`Getting '${jsonPath}' from document: ${path.absoluteDocumentUri}, has: ${has}`);
    return has ? pointer.get(document, jsonPath) : undefined;
  }

  private static http<R>(uri: string): R {
    return fetch(uri, {method: 'GET', compress: false}).json() as R;
  }

  private static file<R>(uri: string): R {

    const fileBuffer = fs.readFileSync(uri);
    const fileContents = fileBuffer.toString();
    return JSON.parse(fileContents) as R;
  }
}
