import nodePath from 'path';
import * as findUp from 'find-up';

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

  /**
   * Warning! Only use for test cases
   */
  public static getPathFromRoot(relative: string) {

    let path: string | undefined = __dirname;
    path = findUp.findUpSync('turbo.json', {cwd: path});
    path = path ? nodePath.dirname(path) : undefined;

    if (!path) {
      return relative;
    }

    return nodePath.resolve(path, relative);
  }
}
