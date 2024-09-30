import {Util} from '@omnigen/core';
import * as path from 'node:path';
import {URL} from 'url';

type ParsedUri = { protocol?: string | undefined, guessedProtocol?: string | undefined, filePath?: string | undefined, hash?: string | undefined };

/**
 * Helper class for working with a URI to a section of a file. Helps with resolving relative and absolute paths.
 */
export default class JsonUri {

  public static readonly EMPTY = new JsonUri(undefined, undefined, []);

  private readonly _protocol: string | undefined;
  private readonly _filePath: string | undefined;
  private readonly _hashParts: ReadonlyArray<string> = [];

  private constructor(protocol: string | undefined, filePath: string | undefined, hashParts: ReadonlyArray<string>) {
    this._protocol = protocol;
    this._filePath = filePath;
    this._hashParts = hashParts;
  }

  public resolve(extra: string | number | Array<string | number> | ParsedUri): JsonUri {

    if (typeof extra === 'string') {
      return this.resolve(JsonUri.parseUri(extra));
    } else if (typeof extra === 'number') {
      return this.resolve(`${extra}`);
    } else if (Array.isArray(extra)) {
      return extra.reduce<JsonUri>((ptr, item) => ptr.resolve(item), this);
    } else {

      const newProtocol = extra.protocol ?? extra.guessedProtocol ?? this.protocol;
      const newFilePath = this.resolvePath(extra.filePath, newProtocol, extra);
      const isAbsoluteHash = extra.hash !== undefined ? extra.hash.startsWith('/') : false;
      const parsedHashParts = extra.hash !== undefined ? Util.trimAny(extra.hash, '/').split('/') : undefined;

      if (parsedHashParts && isAbsoluteHash) {
        return new JsonUri(newProtocol, newFilePath, parsedHashParts);
      } else if (!parsedHashParts) {
        if (extra.filePath && this._hashParts.length > 0) {
          return new JsonUri(newProtocol, newFilePath, []);
        }
        return new JsonUri(newProtocol, newFilePath, this._hashParts);
      } else if (parsedHashParts.length > 1) {
        const ptr = parsedHashParts.reduce<JsonUri>((ptr, item) => ptr.resolve('#' + item), this);
        return new JsonUri(newProtocol, newFilePath, ptr.hashParts);
      } else {

        const singlePart = parsedHashParts[0];
        if (!singlePart) {
          return this;
        } else if (singlePart === '..') {
          return new JsonUri(newProtocol, newFilePath, this._hashParts.slice(0, this._hashParts.length - 1));
        } else {
          return new JsonUri(newProtocol, newFilePath, [...this._hashParts, singlePart]);
        }
      }
    }
  }

  public pushHash(childHash: string): JsonUri {
    return this.resolve({
      hash: childHash,
    });
  }

  private resolvePath(newFilePath: string | undefined, newProtocol: string, parsed: ParsedUri): string | undefined {

    if (!newFilePath) {
      if (!this._filePath) {
        return path.resolve('');
      }

      return this._filePath;
    }

    if (newProtocol === 'file') {

      if (!path.isAbsolute(newFilePath)) {

        if (JsonUri.isWebProtocol(this._protocol)) {
          throw new Error(`Cannot switch from '${this._protocol}' to '${newProtocol}' with a relative path`);
        }

        if (this._filePath && path.extname(this._filePath)) {

          const parsedFilePath = path.parse(newFilePath);
          if (!parsedFilePath.dir && parsedFilePath.ext) {

            // The path might be `/a/b/c.txt` and we give `d.txt`, then we want `/a/b/d.txt`.
            const parsedCurrent = path.parse(this._filePath);
            return path.resolve(parsedCurrent.dir, newFilePath);
          }
        }

        return this._filePath ? path.resolve(this._filePath, newFilePath) : path.resolve(newFilePath);
      } else {
        return path.resolve(newFilePath);
      }
    } else if (!parsed.protocol && JsonUri.isWebProtocol(this._protocol)) {

      if (!parsed.guessedProtocol || !JsonUri.isWebProtocol(parsed.guessedProtocol)) {

        // Parsed path is relative, and the current path is an URL, so let's resolve the new relative path.
        const url = this._filePath
          ? new URL(newFilePath, `${this._protocol}://${this._filePath}`)
          : new URL(`${this._protocol}://${this._filePath}`);

        return `${url.host}${url.pathname}${url.search}`;
      }
    }

    return newFilePath;
  }

  /**
   * Will not give back the uri with any protocol. The path is always absolute.
   */
  public get absoluteFilePath(): string | undefined {
    return this._filePath;
  }

  /**
   * If no protocol is set, then we will assume it is `file`.
   */
  public get protocol(): string {
    return this._protocol ?? 'file';
  }

  private static parseUri(raw: string): ParsedUri {

    const hashParts = raw.split('#');
    let givenFilePath = hashParts[0];

    const parsedHash = (hashParts.length > 1) ? hashParts[hashParts.length - 1] : undefined;

    let givenProtocol: string | undefined = undefined;
    let guessedProtocol: string | undefined = undefined;
    if (givenFilePath) {

      const parts = givenFilePath.split(':');
      if (parts.length === 1) {

        // This could be an URL, but without the `http:` and starts with `www.`
        // But it needs to be up to the caller to decide if that should be used or not.
        if (parts[0].startsWith('www.')) {
          guessedProtocol = 'https';
        }

      } else if (parts.length === 2) {
        if (parts[0].length > 1) {

          // This is NOT a windows drive, so we will assume it is the protocol.
          givenProtocol = parts[0];
          givenFilePath = parts[1];
        }
      } else if (parts.length === 3) {

        // This is a windows path, so 2nd part is the drive, 3rd part is the rest of the path.
        givenProtocol = parts[0];
        givenFilePath = `${parts[1]}:${parts[2]}`;
      }
    }

    return {protocol: givenProtocol, guessedProtocol: guessedProtocol, filePath: givenFilePath, hash: parsedHash};
  }

  private static isWebProtocol(str: string | undefined): boolean {
    return str === 'http' || str === 'https';
  }

  public get absolutePath(): string {

    const currentFilePath = this.absoluteFilePath;
    if (!currentFilePath) {
      throw new Error(`Cannot get the absolute path since we do not know any file path`);
    }

    const currentHash = this.hash;
    const currentPathAndHash = currentHash ? `${currentFilePath}#/${currentHash}` : currentFilePath;
    const currentProtocol = this.protocol;

    if (JsonUri.isWebProtocol(currentProtocol)) {
      return `${currentProtocol}://${currentPathAndHash}`;
    } else {
      return `${currentProtocol}:${currentPathAndHash}`;
    }
  }

  public get hashParts(): ReadonlyArray<string> {
    return this._hashParts;
  }

  /**
   * Does NOT include the prefix `/`.
   */
  public get hash(): string {
    return this._hashParts.join('/');
  }

  public get absoluteHash(): string {
    return `/${this.hash}`;
  }

  public get head(): string | undefined {
    const parts = this.hashParts;
    if (parts.length === 0) {
      return undefined;
    }

    return parts[0];
  }

  public get tail(): string | undefined {
    const parts = this.hashParts;
    if (parts.length === 0) {
      return undefined;
    }

    return parts[parts.length - 1];
  }

  public get parentHash(): JsonUri | undefined {

    // A bit ugly, but should work.
    if (this.hashParts.length === 0) {
      return undefined;
    }

    return this.resolve('#..');
  }

  public get parentPath(): JsonUri | undefined {
    return this.resolve('..');
  }

  public isSameFile(other: JsonUri): boolean {
    return this.protocol === other.protocol && this.absoluteFilePath === other.absoluteFilePath;
  }

  public hasFileName(fileName: string): boolean {
    if (!this._filePath) {
      return false;
    }

    const filePathParts = this._filePath.split(/[/\\]/);
    if (filePathParts.length === 0) {
      return false;
    }

    return filePathParts[filePathParts.length - 1] === fileName;
  }

  public toString(): string {

    if (!this._filePath && this._hashParts.length === 0) {
      return '<EMPTY>';
    }

    return this.absolutePath;
  }
}
