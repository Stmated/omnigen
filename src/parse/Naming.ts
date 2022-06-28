import {pascalCase} from 'change-case';
import {GenericType, GenericTypeKind, TypeName} from '@parse/GenericModel';
import {LoggerFactory} from '@util';
import {JavaUtil} from '@java';

export const logger = LoggerFactory.create(__filename);

export class Naming {

  public static unwrap(name: TypeName): string {
    return (typeof name == 'string') ? name : name();
  }

  public static safer(type: GenericType, hasDuplicateFn?: (value: string) => boolean): string {
    return Naming.safe(type.name, type.nameClassifier, hasDuplicateFn);
  }

  /**
   * TODO: This needs to not be called everywhere. We need to synchronize the names better.
   *        Right now there are situations where a type can be called different things in different places
   *        This is because the final name is not set until at cleanup.
   *        This MUST be fixed sometime later.
   *        Maybe make the name property a callback which can alter during the execution?
   *        (And then finalize it at the end, at the cleanup)
   */
  public static safe(name: TypeName, classifier?: string, hasDuplicateFn?: (value: string) => boolean): string {

    let safeName = '';
    const resolvedName = Naming.unwrap(name);
    if (resolvedName.indexOf('/') !== -1) {
      // The type name contains a slash, which means it is probably a ref name.
      const nameParts = resolvedName.split('/');
      for (let i = nameParts.length - 1; i >= 0; i--) {
        safeName = (pascalCase(nameParts[i]) + safeName);

        if (!hasDuplicateFn || !hasDuplicateFn(safeName)) {
          return safeName;
        }
      }
    } else {
      safeName = pascalCase(resolvedName);
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
    // We should *really* try to avoid this by some other naming.
    for (let i = 1; i < 50; i++) {
      const safeSuffixedName = `${safeName}${i}`;
      if (!hasDuplicateFn(safeSuffixedName)) {
        logger.warn(`Created fallback naming '${safeSuffixedName}', this should be avoided`);
        return safeSuffixedName;
      }
    }

    throw new Error(`Could not build a safe unique name for '${safeName}'`);
  }
}
