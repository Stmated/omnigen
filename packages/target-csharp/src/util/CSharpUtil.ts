import {OmniPrimitiveType, OmniTypeKind} from '@omnigen/core';
import {assertUnreachable} from '@omnigen/core-util';

export class CSharpUtil {

  public static toPrimitiveTypeName(type: OmniPrimitiveType): string {

    const suffix = (type.nullable === true)
      ? '?'
      : (type.nullable === false)
        ? ''
        : '';

    return `${CSharpUtil.toPrimitiveTypeNameBase(type)}${suffix}`;
  }

  private static toPrimitiveTypeNameBase(type: OmniPrimitiveType): string {

    switch (type.kind) {
      case OmniTypeKind.BOOL:
        return 'bool';
      case OmniTypeKind.VOID:
        return 'void';
      case OmniTypeKind.CHAR:
        return 'char';
      case OmniTypeKind.STRING:
        return 'String';
      case OmniTypeKind.FLOAT:
        return 'float';
      case OmniTypeKind.INTEGER:
        return 'int';
      case OmniTypeKind.INTEGER_SMALL:
        return 'short';
      case OmniTypeKind.LONG:
        return 'long';
      case OmniTypeKind.DECIMAL:
      case OmniTypeKind.DOUBLE:
        return 'double';
      case OmniTypeKind.NUMBER:
        return 'double';
      case OmniTypeKind.NULL:
      case OmniTypeKind.UNDEFINED:
        return 'object';
    }

    assertUnreachable(type);
  }

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
