import {pascalCase} from 'change-case';
import {TypeName, TypeNameFn, TypeNameSingle} from '../parse';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(__filename);

export class Naming {

  public static unwrapAll(name: TypeName): string[] {

    const all: string[] = [];
    if (Array.isArray(name)) {
      for (const choice of name) {
        if (choice) {
          const result = Naming.unwrapAll(choice);
          if (result) {
            all.push(...result);
          }
        }
      }
    } else {
      const unwrapped = Naming.unwrapOptional(name);
      if (unwrapped) {
        all.push(unwrapped);
      }
    }

    return all;
  }

  public static unwrapToFirstDefined(name: TypeName): string | undefined {

    if (Array.isArray(name)) {
      for (const choice of name) {
        if (choice) {
          const result = Naming.unwrapToFirstDefined(choice);
          if (result) {
            return result;
          }
        }
      }

      return undefined;
    }

    return Naming.unwrapOptional(name);
  }

  public static simplify(name: TypeName): TypeName {

    if (Array.isArray(name) && name.length == 1) {
      return Naming.simplify(name[0]);
    } else {
      return name;
    }
  }

  private static unwrapOptional(name: TypeNameSingle): string | undefined {
    if (name == undefined) {
      return name;
    }

    if (typeof name == 'string') {
      return name;
    }

    return name();
  }

  /**
   * TODO: This needs to not be called everywhere. We need to synchronize the names better.
   *        Right now there are situations where a type can be called different things in different places
   *        This is because the final name is not set until at cleanup.
   *        This MUST be fixed sometime later.
   *        Maybe make the name property a callback which can alter during the execution?
   *        (And then finalize it at the end, at the cleanup)
   *
   * @param name The name to safely unwrap to a string
   * @param hasDuplicateFn The predicate callback to check for name collisions
   */
  public static safe(name: TypeName, hasDuplicateFn?: TypeNameFn): string {

    if (name == undefined) {
      throw new Error(`Not allowed to give an undefined name`);
    }

    const resolved = Naming.safeInternal(name, hasDuplicateFn);
    if (resolved) {
      return resolved;
    }

    const firstResolvedWithoutDuplicateCheck = Naming.safeInternal(name);
    if (firstResolvedWithoutDuplicateCheck) {

      if (hasDuplicateFn) {

        // If we have come this far, then we will have to attempt to add a numbered suffix.
        // We should *really* try to avoid this by some other naming.
        for (let i = 1; i < 50; i++) {
          const safeSuffixedName = `${firstResolvedWithoutDuplicateCheck}${i}`;
          if (!hasDuplicateFn(safeSuffixedName)) {
            logger.warn(`Created fallback naming '${safeSuffixedName}', this should be avoided`);
            return safeSuffixedName;
          }
        }
      } else {

        // TODO: Do something here? Create a random number or set of character and append to the name?
      }
    }

    throw new Error(`Could not build a safe unique name for '${firstResolvedWithoutDuplicateCheck || ''}'`);
  }

  private static safeInternal(name: TypeName, hasDuplicateFn?: TypeNameFn): string | undefined {

    if (Array.isArray(name)) {
      for (const entry of name) {
        const resolved = Naming.safeInternal(entry, hasDuplicateFn);
        if (resolved) {
          return resolved;
        }
      }
    } else {

      // TODO: Should this be removed and instead up to the caller to have a longer list of potential names?
      //       Feels like that is the better choice; gives more freedom to where we should use the slash (/) fallback.
      let safeName = '';
      const resolvedName = Naming.unwrapOptional(name);
      if (resolvedName) {
        if (resolvedName.indexOf('/') !== -1) {
          // The type name contains a slash, which means it is probably a ref name.
          const nameParts = resolvedName.split('/');
          for (let i = nameParts.length - 1; i >= 0; i--) {
            safeName = (Naming.prefixedPascalCase(nameParts[i]) + safeName);

            if (!hasDuplicateFn || !hasDuplicateFn(safeName)) {
              return safeName;
            }
          }
        } else {
          safeName = Naming.prefixedPascalCase(resolvedName);
        }
      }

      if (!hasDuplicateFn || (safeName.length > 0 && !hasDuplicateFn(safeName))) {
        return safeName;
      }
    }

    return undefined;
  }

  private static prefixedPascalCase(name: string): string {

    if (name.startsWith('_')) {
      return `_${pascalCase(name)}`;
    } else {
      return pascalCase(name);
    }
  }
}
