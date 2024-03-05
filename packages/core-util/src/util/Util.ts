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
}
