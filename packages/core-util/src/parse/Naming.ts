import crypto from 'crypto';
import {TypeName} from '@omnigen/core';
import {NamePair} from './NamePair';
import {ResolvedNamePair} from './ResolvedNamePair';
import {NameCallback} from './NameCallback';
import {Case} from '../util';

const DEF_UNWRAP_CALLBACK: NameCallback<string> = (name, parts, keepPunctuation) => {
  if (keepPunctuation) {
    if (parts && parts.length > 0) {
      return `${parts.join('')}${name}`;
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

    if (typeof input == 'object') {
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
}
