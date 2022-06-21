import {pascalCase} from 'change-case';

export class NamingUtil {

  public static getSafeTypeName(name: string, hasDuplicateFn?: (value: string) => boolean): string {

    let safeName = '';
    if (name.indexOf('/') !== -1) {
      // The type name contains a slash, which means it is probably a ref name.
      const nameParts = name.split('/');
      for (let i = nameParts.length - 1; i >= 0; i--) {
        safeName = (nameParts[i] + pascalCase(safeName));

        // safeParts.push(nameParts[i]);
        // const safeName = safeParts.map(it => pascalCase(it)).join('');
        if (!hasDuplicateFn || !hasDuplicateFn(safeName)) {
          return safeName;
        }
      }
    } else {
      safeName = pascalCase(name);
    }

    if (!hasDuplicateFn || !hasDuplicateFn(safeName)) {
      return safeName;
    }

    // If we have come this far, then we will have to attempt to add a numbered suffix.
    for (let i = 1; i < 20; i++) {
      const safeSuffixedName = `${safeName}${i}`;
      if (!hasDuplicateFn(safeSuffixedName)) {
        return safeSuffixedName;
      }
    }

    throw new Error(`Could not build a safe unique name for '${name}'`);
  }
}
