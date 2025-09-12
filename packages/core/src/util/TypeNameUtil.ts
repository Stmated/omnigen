import {TypeName} from '@omnigen/api';

export class TypeNameUtil {

  public static addName(existing: TypeName, add: TypeName): TypeName {

    if (Array.isArray(existing)) {
      return [...existing, add];
    } else if (typeof existing === 'string') {
      return [existing, add];
    } else {

      // Existing is a modifier. We will try to merge into it if possible, to keep the object graph smaller.
      if (!existing.suffix) {
        return {
          ...existing,
          suffix: add,
        };
      }

      // Otherwise we create an array out of it.
      return [existing, add];
    }
  }

  public static shallowCopy(existing: TypeName): TypeName {
    
    if (Array.isArray(existing)) {
      return [...existing]; // existing.map(it => this.clone(it));
    } else if (typeof existing === 'string') {
      return existing;
    } else {
      return {
        ...existing,
        // name: existing.name,
        // prefix: existing.prefix ? this.clone(existing.prefix) : undefined,
        // suffix: existing.suffix ? this.clone(existing.suffix) : undefined,
      };
    }
  }
}
