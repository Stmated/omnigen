import crypto from 'crypto';
import {OmniType, OmniTypeKind, TypeName} from '@omnigen/api';
import {NamePair} from './NamePair';
import {ResolvedNamePair} from './ResolvedNamePair';
import {NameCallback} from './NameCallback';
import {Case, Util} from '../util';
import {OmniUtil} from './OmniUtil';
import fs from 'fs';
import path from 'path';

const PATTERN_NUMBERS_ONLY = /^[0-9_\-]+$/;

const DEF_UNWRAP_CALLBACK: NameCallback<string> = (name, parts, keepPunctuation) => {
  if (keepPunctuation) {
    if (parts && parts.length > 0) {
      return `${parts.join('')}${Naming.prefixedPascalCase(name)}`;
    } else {
      return name;
    }
  } else {
    if (parts && parts.length > 0) {
      return `${parts.map(it => Naming.prefixedPascalCase(it)).join('')}${Naming.prefixedPascalCase(name)}`;
    } else {
      return Naming.prefixedPascalCase(name);
    }
  }
};

export class Naming {

  public static unwrap(name: TypeName): string {

    const unwrapped = Naming.unwrapWithCallback(name, DEF_UNWRAP_CALLBACK);
    if (unwrapped === undefined) {
      throw new Error(`Given an empty name`);
    }

    return unwrapped;
  }

  public static unwrapWithCallback<R>(
    input: TypeName,
    callback: NameCallback<R>,
  ): R | undefined {

    if (input == undefined) {
      return input;
    }

    if (typeof input === 'string') {

      // The type name contains a slash, which means it is probably a ref name.
      const nameParts = input.split('/');
      if (nameParts.length > 1) {

        const lastNamePart = nameParts[nameParts.length - 1];
        for (let i = nameParts.length - 1; i >= 0; i--) {
          const namePartsSlice = (i == nameParts.length - 1) ? [] : nameParts.slice(i, -1).reverse();
          const result = callback(lastNamePart, namePartsSlice);
          if (result) {
            return result;
          }
        }

        return undefined;

      } else {
        return callback(input) || undefined;
      }
    }

    if (Array.isArray(input)) {

      if (input.length > 0) {
        for (const entry of input) {
          const result = Naming.unwrapWithCallback(entry, (name, parts) => {
            return callback(name, parts);
          });

          if (result) {
            return result;
          }
        }
      }

      return undefined;
    }

    if (typeof input === 'object' && !Array.isArray(input)) {
      return Naming.unwrapWithCallback(input.name, (name, parts) => {
        return Naming.unwrapWithCallback(input.prefix ?? '', (prefix, _prefixParts) => {
          return Naming.unwrapWithCallback(input.suffix ?? '', (suffix, _suffixParts) => {

            // NOTE: Do we ever need to care about the prefix and suffix parts?
            const modifiedName = `${prefix}${name}${suffix}`;
            return callback(modifiedName, parts);
          });
        });
      });
    }

    return undefined;
  }

  public static unwrapPairs<T>(pairs: NamePair<T>[], callback: NameCallback<string> = DEF_UNWRAP_CALLBACK): ResolvedNamePair<T, string>[] {

    // This is a pair. We should resolve the actual name and replace it with a resolved pair.
    const result: ResolvedNamePair<T, string>[] = [];

    const encountered: string[] = [];
    for (const pair of pairs) {

      const pairNames: string[] = [];
      let foundName = Naming.unwrapWithCallback(pair.name, (name, parts) => {

        const resolvedName = callback(name, parts);
        if (!resolvedName) {
          return undefined;
        }

        pairNames.push(resolvedName);
        if (encountered.includes(resolvedName)) {

          // This name has already been found before.
          // Need to keep looking for an available, alternative name.
          return undefined;
        } else {
          encountered.push(resolvedName);
        }

        return resolvedName;
      });

      if (!foundName) {

        // We could not find any available name.
        // So what we will do is try again, but with an index appended at the end.
        for (let i = 1; i <= 5 && !foundName; i++) {
          for (const pairName of pairNames) {
            const indexedName = `${pairName}_${i}`;
            const acceptedIndexedName = callback(indexedName, undefined, true);
            if (acceptedIndexedName) {
              if (!encountered.includes(acceptedIndexedName)) {
                foundName = acceptedIndexedName;
                encountered.push(acceptedIndexedName);
                break;
              } else {
                // NOTE: Is it even needed at all to add the names to the list here?
                encountered.push(acceptedIndexedName);
              }
            }
          }
        }
      }

      if (!foundName) {

        // We could *still* not find a suitable name. So we will need to give a random one.
        const firstName = pairNames.length > 0 ? pairNames[0] : '';
        foundName = `${firstName}_${crypto.randomBytes(20).toString('hex')}`;
      }

      result.push({owner: pair.owner, name: foundName});
    }

    return result;
  }

  public static simplify(name: TypeName): TypeName {

    if (Array.isArray(name) && name.length == 1) {
      return Naming.simplify(name[0]);
    } else {
      return name;
    }
  }

  public static prefixedPascalCase(name: string): string {

    if (name.startsWith('_')) {
      return `_${Case.pascalKeepUpperCase(name)}`;
    } else {
      return Case.pascalKeepUpperCase(name);
    }
  }

  /**
   * TODO: This can likely be improved by lots, like finding the common prefix and suffix and unique base.
   *        Rework and expand it as-needed.
   */
  public static getCommonName(names: Array<TypeName | undefined>, minimumWordCount = 2, delimiter?: string): TypeName | undefined {

    if (names.length == 0) {
      return undefined;
    }

    if (names.length == 1) {
      return names[0];
    }

    const strings: string[] = [];
    for (const name of names) {
      if (!name) {
        continue;
      }

      const firstName = Naming.unwrapWithCallback(name, str => str);
      if (firstName) {
        strings.push(firstName);
      }
    }

    const splitStrings = strings.map(Naming.getWords);

    let commonJoined: string | undefined = undefined;

    for (let startIndex = 0; startIndex < splitStrings.length; startIndex++) {
      let commonParts = splitStrings[startIndex];
      let localJoined: string | undefined = undefined;

      for (let step = 0; step < splitStrings.length - 1; step++) {
        const i = (startIndex + step + 1) % splitStrings.length;
        commonParts = Naming.findCommonStrings(commonParts, splitStrings[i]);
        if (commonParts.length < minimumWordCount) {
          break;
        }

        // TODO: Get tid of the pascal case from here, let it be resolved later. Expand and work with `TypeName`
        localJoined = commonParts.map(it => Case.pascal(it)).join(delimiter ?? '');
      }

      if (commonJoined == undefined || (localJoined !== undefined && localJoined.length > commonJoined.length)) {
        commonJoined = localJoined;
      }
    }

    if (!commonJoined) {
      return undefined;
    }

    let prefixOffset = splitStrings[0].length;
    for (let i = 1; i < splitStrings.length; i++) {
      let localOffset = 0;
      for (let n = 0; n < prefixOffset; n++) {
        if (splitStrings[0][n] !== splitStrings[i][n]) {
          break;
        } else {
          localOffset++;
        }
      }

      prefixOffset = Math.min(prefixOffset, localOffset);
      if (prefixOffset == 0) {
        break;
      }
    }

    let suffixOffset = 0;
    let searchSuffix = true;
    for (let i = 1; i < splitStrings.length && searchSuffix; i++) {
      for (let n = splitStrings[0].length - 1; n >= 0; n--) {
        if (splitStrings[0][n] !== splitStrings[i][n]) {
          searchSuffix = false;
          break;
        } else {
          suffixOffset++;
        }
      }
    }

    // TODO: Get tid of the pascal case from here, let it be resolved later. Expand and work with `TypeName`
    let prefix = (prefixOffset > 0) ? splitStrings[0].slice(0, prefixOffset).map(it => Case.pascal(it)).join('') : '';
    let suffix = (suffixOffset > 0) ? splitStrings[0].slice(-suffixOffset).map(it => Case.pascal(it)).join('') : '';

    if (commonJoined.startsWith(prefix)) {
      prefix = '';
    }

    if (commonJoined.endsWith(suffix)) {
      suffix = '';
    }

    return `${prefix}${commonJoined}${suffix}`;
  }

  public static getWords(str: string): string[] {

    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
      .replace(/_/g, ' ') // Split snake_case
      .split(' ')
      .map(word => word.toLowerCase());
  }

  public static findCommonStrings = (arr1: string[], arr2: string[]): string[] => {

    const joined2 = arr2.join(' ');

    let commonSubstrings: string[] = [];
    for (let start = 0; start < arr1.length; start++) {
      for (let end = start + 1; end <= arr1.length; end++) {
        const subarr = arr1.slice(start, end);
        const joined1 = subarr.join(' ');

        if (joined2.includes(joined1) && subarr.length > commonSubstrings.length) {
          commonSubstrings = subarr;
        }
      }
    }

    return commonSubstrings;
  };

  public static getNameString(type: OmniType): string | undefined {
    const name = this.getName(type);
    return name ? this.unwrap(name) : undefined;
  }

  public static getName(type: OmniType): TypeName | undefined {

    if (type.kind === OmniTypeKind.GENERIC_TARGET) {
      return Naming.getName(type.source);
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      return Naming.getName(type.of);
    } else if (type.kind == OmniTypeKind.OBJECT) {
      return type.name;
    } else if (type.kind == OmniTypeKind.ENUM) {
      return type.name;
    } else if (type.kind == OmniTypeKind.INTERFACE) {
      return type.name ?? Naming.getName(type.of);
    } else if (OmniUtil.isPrimitive(type)) {
      return type.name;
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return type.name;
    } else if (type.kind == OmniTypeKind.DECORATING) {
      return Naming.getName(type.of);
    } else {
      throw new Error(`Unknown type ${OmniUtil.describe(type)} to get name from, add it to Naming#getName`);
    }
  }

  public static merge(a: TypeName, b: TypeName | undefined): TypeName;
  public static merge(a: TypeName | undefined, b: TypeName): TypeName;
  public static merge(a: TypeName, b: TypeName): TypeName;
  public static merge(a: TypeName | undefined, b: TypeName | undefined): TypeName | undefined {

    if (!a) {
      return b;
    } else if (!b) {
      return a;
    }

    if (Naming.isSame(a, b, 0)) {
      return a;
    }

    if (typeof a === 'string' && typeof b === 'string') {
      return [a, b];
    } else if (Array.isArray(a) && Array.isArray(b)) {
      return [...a, ...b];
    } else if (Array.isArray(a)) {
      return [...a, b];
    } else if (Array.isArray(b)) {
      return [a, ...b];
    } else {
      return [a, b];
    }
  }

  private static isSame(a: TypeName, b: TypeName, depth: number): boolean {

    if (a === b) {
      return true;
    } else if (typeof a === 'string' && typeof b === 'string') {
      return false;
    }

    if (depth > 10) {
      throw new Error(`The type names are too deep, the nesting is too great`);
    }

    if (Array.isArray(a)) {
      for (const aItem of a) {
        if (Naming.isSame(aItem, b, depth + 1)) {
          return true;
        }
      }

      return false;
    } else if (Array.isArray(b)) {
      for (const bItem of b) {
        if (Naming.isSame(a, bItem, depth + 1)) {
          return true;
        }
      }

      return false;
    }

    const aName = (typeof a === 'object') ? a.name : a;
    const bName = (typeof b === 'object') ? b.name : b;

    const aPrefix = (typeof a === 'object') ? a.prefix : undefined;
    const aSuffix = (typeof a === 'object') ? a.suffix : undefined;
    const bPrefix = (typeof b === 'object') ? b.prefix : undefined;
    const bSuffix = (typeof b === 'object') ? b.suffix : undefined;

    if (!!aPrefix !== !!bPrefix) {
      return false;
    } else if (!!aSuffix !== !!bSuffix) {
      return false;
    }

    if (!Naming.isSame(aName, bName, depth + 1)) {
      return false;
    } else if (aPrefix && bPrefix && !Naming.isSame(aPrefix, bPrefix, depth + 1)) {
      return false;
    } else if (aSuffix && bSuffix && !Naming.isSame(aSuffix, bSuffix, depth + 1)) {
      return false;
    }

    return true;
  }

  public static parse(value: string | undefined, stripLocalPath = true): TypeName | undefined {

    if (!value) {
      return undefined;
    }

    const hashIndex = value.indexOf('#');
    let base = (hashIndex === -1) ? value : value.substring(0, hashIndex);
    const hash = (hashIndex === -1) ? undefined : value.substring(hashIndex + 1);

    if (stripLocalPath) {

      const lower = base.toLocaleLowerCase();
      if (lower.startsWith('file:')) {
        base = '';
      } else if (base.includes(path.sep) && fs.existsSync(base)) {
        base = '';
      }
    }

    const parts = base.split(/[/\\]/)
      .map(it => it.trim())
      .filter(Boolean)
      .map(it => Util.trimAny(it, ':'));

    const hashParts = !hash ? [] : hash.split(/[/\\]/)
      .map(it => it.trim())
      .filter(Boolean)
      .map(it => Util.trimAny(it, ':'));

    parts.push(...hashParts);

    if (parts.length === 0) {
      return undefined;
    }

    const names: TypeName[] = [];

    const partsWithoutNonsense = parts.filter(it => !PATTERN_NUMBERS_ONLY.test(it));
    if (partsWithoutNonsense.length !== parts.length) {
      this.addPartsToNames(partsWithoutNonsense, names);
    }

    this.addPartsToNames(parts, names);

    return names;
  }

  private static addPartsToNames(parts: string[], names: TypeName[]) {

    for (let i = 0; i < parts.length; i++) {
      const slice: TypeName[] = parts.slice(parts.length - (i + 1), parts.length);
      const name = slice.reduce((p, c) => p ? {prefix: p, name: c} : c);
      if (!Naming.isSame(names, name, 0)) {
        names.push(name);
      }
    }
  }

  /**
   * Sorts a name, so that any name options are in an order of being more probable to be a nice-looking name.
   * For example: some $id or $schema or similar meta-keys in some contracts contain a version number like `SomeService/2` -- then we likely wouldn't want `2` as the name.
   */
  public static sort(names: TypeName): TypeName {

    return names;
  }
}
