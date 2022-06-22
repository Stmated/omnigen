import {pascalCase} from 'change-case';

export class NamingUtil {

  /**
   * TODO: This needs to not be called everywhere. We need to synchronize the names better.
   *        Right now there are situations where a type can be called different things in different places
   *        This is because the final name is not set until at cleanup.
   *        This MUST be fixed sometime later.
   *        Maybe make the name property a callback which can alter during the execution?
   *        (And then finalize it at the end, at the cleanup)
   */
  public static getSafeTypeName(name: string, classifier?: string, hasDuplicateFn?: (value: string) => boolean): string {

    let safeName = '';
    if (name.indexOf('/') !== -1) {
      // The type name contains a slash, which means it is probably a ref name.
      const nameParts = name.split('/');
      for (let i = nameParts.length - 1; i >= 0; i--) {
        safeName = (nameParts[i] + pascalCase(safeName));

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

    if (classifier) {

      // Add the classifier, which might make class "Pet" into "ResponsePet"
      safeName = `${pascalCase(classifier)}${safeName}`;
      if (!hasDuplicateFn(safeName)) {
        return safeName;
      }
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
