import fetch from 'sync-fetch';
import fs from 'fs';
import pointer, {JsonObject} from 'json-pointer';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonUri} from '@omnigen-org/json-expander';
import {DocumentStore} from './DocumentStore.ts';

const logger = LoggerFactory.create(import.meta.url);

export class JsonPathFetcher {

  public static get(path: JsonUri, store?: DocumentStore): JsonObject | undefined {

    const jsonPath = path.absoluteHash;

    if (!path.absoluteFilePath) {
      throw new Error(`Given path must have an absolute file path`);
    }

    let document = store ? store.get(path.absoluteFilePath) : undefined;
    if (document) {
      logger.silent(`Has cached document '${path.absoluteFilePath}', will get path '${jsonPath}'`);
      return pointer.has(document, jsonPath) ? pointer.get(document, jsonPath) : undefined;
    }

    logger.silent(`Loading document '${path.absoluteFilePath}'`);
    if (path.protocol === 'file') {
      document = JsonPathFetcher.file<JsonObject>(path.absoluteFilePath);
    } else if (path.protocol === 'http' || path.protocol === 'https') {
      document = JsonPathFetcher.http<JsonObject>(path.absoluteFilePath);
    } else {
      throw new Error(`Unknown protocol ${path.protocol}`);
    }

    if (store) {
      store.set(path.absoluteFilePath, document);
    }

    const has = pointer.has(document, jsonPath);
    logger.silent(`Getting '${jsonPath}' from document: ${path.absoluteFilePath}, has: ${has}`);
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
