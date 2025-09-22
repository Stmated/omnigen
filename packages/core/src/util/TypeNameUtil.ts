import {TypeName, TypeNameModifier} from '@omnigen/api';

export class TypeNameUtil {

  public static shallowCopy(existing: undefined): undefined
  public static shallowCopy(existing: TypeName): TypeName
  public static shallowCopy(existing: TypeName | undefined): TypeName | undefined {

    if (!existing) {
      return undefined;
    } else if (Array.isArray(existing)) {
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
