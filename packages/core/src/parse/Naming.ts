import crypto from 'crypto';
import {OmniType, OmniTypeKind, TypeName, TypeNameCase, UnknownKind} from '@omnigen/api';
import {NamePair} from './NamePair';
import {ResolvedNamePair} from './ResolvedNamePair';
import {NameCallback} from './NameCallback';
import {Case, isDefined, Util} from '../util';
import {OmniUtil} from './OmniUtil';
import fs from 'fs';
import path from 'path';

const PATTERN_NUMBERS_ONLY = /^[0-9_.\-]+$/;
const PATTERN_VERSION = /^v\d+(\.\d+){0,2}$|^\d+(\.\d+){1,2}$/;

const DEF_UNWRAP_CALLBACK: NameCallback<string> = (name, parts, keepPunctuation, nameCase) => {
  if (keepPunctuation) {
    if (parts && parts.length > 0) {
      return `${parts.join('')}${Naming.prefixedPascalCase(name)}`;
    } else {
      return name;
    }
  } else if (parts && parts.length > 0) {
    return `${parts.map(it => Naming.prefixedPascalCase(it)).join('')}${Naming.prefixedPascalCase(name)}`;
  } else {
    return Naming.prefixedPascalCase(name);
  }
};

interface ParseParts {
  parts: string[];
  hashes: string[];
  protocol: string | undefined;
  at: string | undefined;
  hashAt: string | undefined;
}

export class Naming {

  public static unwrap(name: TypeName | undefined): string {

    if (!name) {
      return '';
    }

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
          const result = callback(lastNamePart, namePartsSlice, undefined, undefined);
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
      for (const entry of input) {
        const result = Naming.unwrapWithCallback(entry, callback);
        if (result) {
          return result;
        }
      }
    } else if (typeof input === 'object') {
      return Naming.unwrapWithCallback(input.name, (name, parts, nameKeep, nameCase) => {
        return Naming.unwrapWithCallback(input.prefix ?? '', (prefix, _prefixParts, prefixKeep, prefixCase) => {
          return Naming.unwrapWithCallback(input.suffix ?? '', (suffix, _suffixParts, suffixKeep, suffixCase) => {

            const casedPrefix = (input.case === 'pascal') ? Naming.prefixedPascalCase(prefix) : prefix;
            const casedName = (input.case === 'pascal') ? Naming.prefixedPascalCase(name) : name;
            const casedSuffix = (input.case === 'pascal') ? Naming.prefixedPascalCase(suffix) : suffix;

            return callback(`${casedPrefix}${casedName}${casedSuffix}`, parts, prefix ? prefixKeep : nameKeep, prefix ? prefixCase : nameCase);
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
      let foundName = Naming.unwrapWithCallback(pair.name, (name, parts, keep, nameCase) => {

        const resolvedName = callback(name, parts, keep, nameCase);
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

  public static toCase(name: TypeName, toCase: TypeNameCase): TypeName {
    if (typeof name === 'string' || Array.isArray(name)) {
      return {name: name, case: toCase};
    } else {
      return {...name, case: toCase};
    }
  }

  public static addSuffix(name: TypeName | undefined, suffix: TypeName): TypeName {
    if (!name) {
      return suffix;
    }

    if (typeof name === 'string' || Array.isArray(name)) {
      return {name: name, suffix: suffix};
    } else {
      return {...name, suffix: Naming.merge(name.suffix, suffix)};
    }
  }

  public static simplify(name: TypeName | undefined, depth = 0): TypeName | undefined {

    if (!name) {
      return undefined;
    }

    if (depth > 10) {
      // We're in an endless loop, bail out. Perhaps fix the places that create such structures.
      return name;
    }

    if (Array.isArray(name)) {

      const simplified = [...new Set(name.flatMap(it => Naming.simplify(it, depth + 1)).filter(isDefined))];

      if (simplified.length === 0) {
        return undefined;
      } else if (simplified.length === 1) {
        return simplified[0];
      }

      if (simplified.length > 1) {

        // TODO: Rewrite this to step through the array and splice it as we go. Aggregating names and prefixes and suffixes inline.
        let hasSameName = true;
        for (let i = 1; i < simplified.length; i++) {
          const p = Naming.getNameName(simplified[i - 1]);
          const c = Naming.getNameName(simplified[i]);

          if (!p || !c || !Naming.isSame(p, c, depth + 1)) {
            hasSameName = false;
            break;
          }
        }

        if (hasSameName) {

          const suffixes = simplified.map(it => Naming.getSuffix(it)).filter(isDefined);
          if (suffixes.length === simplified.length) {

            // Can replace [{name: X, suffix: A}, {name: X, suffix: B}] with {name: X, suffix: [A, B]}
            const foundName = Naming.getNameName(simplified[0]);
            if (foundName) {
              return {name: foundName, suffix: Naming.simplify(suffixes)};
            }
          }
        }
      }

      return simplified;
    } else if (typeof name === 'object') {

      if (name.prefix) {
        const simplified = Naming.simplify(name.prefix);
        if (name.prefix !== simplified) {
          name = {...name, prefix: simplified};
        }
      }

      if (name.suffix) {
        const simplified = Naming.simplify(name.suffix);
        if (name.suffix !== simplified) {
          name = {...name, suffix: simplified};
        }
      }

      if (name.name) {

        const simplified = Naming.simplify(name.name);
        if (!simplified) {
          return undefined;
        }

        if (name.name !== simplified) {
          name = {...name, name: simplified};
        }

        if (Object.keys(name).length == 1) {
          return Naming.simplify(name.name, depth + 1);
        }
      }
    }

    return name;
  }

  private static getNameName(name: TypeName | undefined): TypeName | undefined {
    if (typeof name === 'object' && !Array.isArray(name)) {
      return name.name;
    }
    return undefined;
  }

  private static getSuffix(name: TypeName | undefined): TypeName | undefined {
    if (typeof name === 'object' && !Array.isArray(name) && name.suffix) {
      return name.suffix;
    }
    return undefined;
  }

  /**
   * Utility function for debugging, when looking if a name contains a possible variant.
   */
  public static has(name: TypeName | undefined, needle: string): boolean {

    if (!name) {
      return false;
    }

    needle = needle.toLowerCase();

    // TODO: Move the NameCallback args to single-arg options object, and add way to abort the unwrapping.
    let found = false;
    try {
      Naming.unwrapWithCallback(name, variant => {

        if (variant.toLowerCase() === needle) {
          found = true;
          throw new Error(`Abort :)`);
        }
      });
    } catch (ex) {
      // Ignore.
    }

    return found;
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
    } else if (type.kind == OmniTypeKind.INTERFACE) {
      return type.name ?? Naming.getName(type.of);
    } else if (type.kind == OmniTypeKind.DECORATING) {
      return Naming.getName(type.of);
    } else if (OmniUtil.isNameable(type)) {
      return type.name;
    } else {
      throw new Error(`Unknown type ${OmniUtil.describe(type)} to get name from, add it to Naming#getName`);
    }
  }

  // TODO: There is likely a case here when we could merge things to be placed in `prefix` and `suffix` respectively based on some patterns?
  public static merge(a: TypeName | undefined, b: TypeName | undefined): TypeName | undefined {

    if (!a) {
      return b;
    } else if (!b) {
      return a;
    }

    if (Naming.isSame(a, b, 0)) {
      return a;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      return Naming.simplify([...a, ...b]);
    } else if (Array.isArray(a)) {
      return Naming.simplify([...a, b]);
    } else if (Array.isArray(b)) {
      return Naming.simplify([a, ...b]);
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

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }

      for (let i = 0; i < a.length; i++) {
        const aItem = a[i];
        const bItem = b[i];
        if (!Naming.isSame(aItem, bItem, depth + 1)) {
          return false;
        }
      }

      return true;
    } else if (Array.isArray(a)) {
      return false;
      // for (const aItem of a) {
      //   if (Naming.isSame(aItem, b, depth + 1)) {
      //     return true;
      //   }
      // }
      //
      // return false;
    } else if (Array.isArray(b)) {
      return false;
      // for (const bItem of b) {
      //   if (Naming.isSame(a, bItem, depth + 1)) {
      //     return true;
      //   }
      // }
      //
      // return false;
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

  public static parseToParts(
    value: string | undefined,
    stripLocalPath = true,
    separateAt = false,
  ): ParseParts | undefined {

    if (!value) {
      return undefined;
    }

    const hashIndex = value.indexOf('#');
    let base = (hashIndex === -1) ? value : value.substring(0, hashIndex);
    let hash = (hashIndex === -1) ? undefined : value.substring(hashIndex + 1);

    if (stripLocalPath) {

      const lower = base.toLocaleLowerCase();
      if (lower.startsWith('file:')) {
        base = '';
      } else if (base.includes(path.sep) && fs.existsSync(base)) {
        base = '';
      }
    }

    let baseAt: string | undefined = undefined;
    if (separateAt) {
      let atIndex = base.lastIndexOf('@');
      if (atIndex !== -1) {
        baseAt = base.substring(atIndex + 1);
        base = base.substring(0, atIndex);
      }
    }

    const unfilteredParts = base.split(/[/\\]/)
      .map(it => it.trim())
      .filter(Boolean);

    let protocol: string | undefined = undefined;
    if (unfilteredParts.length > 0 && unfilteredParts[0].endsWith(':')) {
      protocol = Util.trimAny(unfilteredParts[0], ':').toLowerCase();
    }

    const parts = unfilteredParts
      .filter(it => it !== 'http:' && it !== 'https:')
      .map(it => Util.trimAny(it, ':'));

    let hashAt: string | undefined = undefined;
    if (separateAt && hash) {
      let atIndex = hash.lastIndexOf('@');
      if (atIndex !== -1) {
        hashAt = hash.substring(atIndex + 1);
        hash = hash.substring(0, atIndex);
      }
    }

    const hashParts = !hash ? [] : hash.split(/[/\\]/)
      .map(it => it.trim())
      .filter(Boolean)
      .map(it => Util.trimAny(it, ':'))
      .filter(it => !it.startsWith('$'));

    return {parts, hashes: hashParts, protocol, at: baseAt, hashAt};
  }

  public static parse(
    value: string | undefined,
    stripLocalPath = true,
    stripAt = false,
  ): TypeName | undefined {

    const parsedParts = Naming.parseToParts(value, stripLocalPath, stripAt);
    return Naming.parsePartsToVariants(parsedParts);
  }

  public static parsePartsToVariants(parsedParts: ParseParts | undefined): TypeName | undefined {

    if (!parsedParts) {
      return undefined;
    }

    const parts: string[] = [];
    parts.push(...parsedParts.parts);
    parts.push(...parsedParts.hashes);

    if (parts.length === 0) {
      return undefined;
    }

    const names: TypeName[] = [];

    const partsWithoutNonsense = parts.filter(it => !PATTERN_NUMBERS_ONLY.test(it));
    const versions = parts.filter(it => PATTERN_VERSION.test(it));

    if (partsWithoutNonsense.length !== parts.length) {
      this.addPartsToNames(partsWithoutNonsense, names, versions);
    }

    this.addPartsToNames(parts, names, versions);

    return Naming.simplify(names);
  }

  private static addPartsToNames(parts: string[], names: TypeName[], suffixes: TypeName[]) {

    for (let i = 0; i < parts.length; i++) {
      const slice: TypeName[] = parts.slice(parts.length - (i + 1), parts.length);
      const reduced = slice.reduce((p, c) => p ? {prefix: p, name: c} : c);
      const suffixed: TypeName[] = (suffixes.length > 0) ? suffixes.map(suffix => [reduced, {name: reduced, suffix} satisfies TypeName]) : [reduced];

      for (const name of suffixed) {
        if (!Naming.isSame(names, name, 0)) {
          names.push(name);
        }
      }
    }
  }
}
