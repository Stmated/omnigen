import path from 'path';
import fs from 'fs';
import url from 'url';
import {Arrayable} from '@omnigen/api';

// import * as findUp from 'find-up';

export class Util {

  public static trimAny(str: string, chars: string | string[], trimStart = true, trimEnd = true) {

    let start = 0;
    let end = str.length;

    while (trimStart && start < end && chars.indexOf(str[start]) >= 0) {
      ++start;
    }

    while (trimEnd && end > start && chars.indexOf(str[end - 1]) >= 0) {
      --end;
    }

    return (start > 0 || end < str.length) ? str.substring(start, end) : str;
  }

  public static getWorkingDirectory() {

    try {
      const filename = url.fileURLToPath(import.meta.url);
      return path.dirname(filename);
    } catch {
      return __dirname;
    }
  }

  /**
   * Warning! Only use for test cases
   */
  public static getPathFromRoot(relative: string) {

    let dir = Util.getWorkingDirectory();

    for (let maxSteps = 10; maxSteps >= 0; maxSteps--) {

      const file = path.resolve(dir, 'turbo.json');
      if (fs.existsSync(file)) {
        return path.resolve(dir, relative);
      } else {
        const newDir = path.dirname(dir);
        if (dir === newDir) {
          break;
        }
        dir = newDir;
      }
    }

    throw new Error(`Could not find 'turbo.json'`);
  }

  public static getCommonPrefixLength(str: string, target: string): number {
    let length = 0;
    const minLength = Math.min(str.length, target.length);
    for (let i = 0; i < minLength; i++) {
      if (str[i] === target[i]) {
        length++;
      } else {
        break;
      }
    }
    return length;
  }

  /**
   * TODO: Move to an `Arrayables` helper lib
   */
  public static count<T, R>(input: Arrayable<T>): number {
    if (Array.isArray(input)) {
      return input.length;
    } else {
      return 1;
    }
  }

  /**
   * TODO: Move to an `Arrayables` helper lib
   */
  public static forEach<T, R>(input: Arrayable<T>, callback: (v: T) => R | undefined): R | undefined {
    if (Array.isArray(input)) {
      for (const item of input) {
        const result = callback(item);
        if (result !== undefined) {
          return result;
        }
      }
      return undefined;
    } else {
      return callback(input);
    }
  }

  /**
   * TODO: Move to an `Arrayables` helper lib
   */
  public static mapToDefined<T, R>(input: Arrayable<T>, callback: (v: T) => R | undefined): Array<R> {
    const array: Array<R> = [];
    if (Array.isArray(input)) {
      for (const item of input) {
        const result = callback(item);
        if (result !== undefined) {
          array.push(result);
        }
      }
    } else {
      const result = callback(input);
      if (result !== undefined) {
        array.push(result);
      }
    }

    return array;
  }
}
