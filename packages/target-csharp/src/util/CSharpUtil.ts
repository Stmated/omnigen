import {OmniPrimitiveType, OmniTypeKind} from '@omnigen/core';
import {assertUnreachable} from '@omnigen/core-util';

const CSHARP_RESERVED_WORDS = [
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do',
  'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock',
  'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof',
  'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
];

export class CSharpUtil {

  public static isReservedWord(word: string): boolean {
    return CSHARP_RESERVED_WORDS.includes(word);
  }

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
        return 'boolean';
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
}
