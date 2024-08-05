import {OmniPrimitiveType, OmniTypeKind} from '@omnigen/api';

export class CSharpUtil {

  public static isPrimitiveBoxed(type: OmniPrimitiveType): boolean {

    if (type.kind == OmniTypeKind.NULL || type.kind == OmniTypeKind.VOID) {
      return false;
    }

    if (type.kind == OmniTypeKind.STRING) {

      // If it's a string it's not boxed, it it always the same.
      return false;
    }

    return type.nullable === true;
  }
}
