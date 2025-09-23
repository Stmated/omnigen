import path from 'path';
import fs from 'fs';
import url from 'url';

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
}
