import {ObjectName, OmniPrimitiveKinds, OmniPrimitiveType, OmniTypeKind, OmniUnknownType, PackageOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {JAVA_RESERVED_WORDS, JavaUtil} from '../util';
import {AbstractObjectNameResolver} from '@omnigen/core';
import {JavaOptions} from '../options';

export class JavaObjectNameResolver extends AbstractObjectNameResolver<PackageOptions & TargetOptions & JavaOptions> {

  namespaceSeparator = '.';

  isReservedWord(word: string): boolean {
    return JAVA_RESERVED_WORDS.includes(word) || JAVA_LANG_CLASSES.includes(word);
  }

  parse(fqn: string): ObjectName {
    return JavaObjectNameResolver.internalParse(fqn);
  }

  public static internalParse(fqn: string): ObjectName {

    const parts = fqn.split('.');

    return {
      namespace: parts.slice(0, -1),
      edgeName: parts[parts.length - 1],
    };
  }

  protected getPrimitiveName(type: OmniPrimitiveType, kind: OmniPrimitiveKinds, boxed: boolean | undefined, options: JavaOptions): ObjectName {

    boxed = boxed ?? JavaUtil.isPrimitiveBoxed(type);

    if (kind == OmniTypeKind.NUMBER && options.preferNumberType !== kind) {
      kind = options.preferNumberType;
    }

    switch (kind) {
      case OmniTypeKind.BOOL:
        return boxed ? {namespace: ['java', 'lang'], edgeName: 'Boolean'} : {namespace: [], edgeName: 'boolean'};
      case OmniTypeKind.VOID:
        return {namespace: [], edgeName: 'void'};
      case OmniTypeKind.CHAR:
        return boxed ? {namespace: ['java', 'lang'], edgeName: 'Character'} : {namespace: [], edgeName: 'char'};
      case OmniTypeKind.STRING:
        return {namespace: ['java', 'lang'], edgeName: 'String'};
      case OmniTypeKind.FLOAT:
        return boxed ? {namespace: ['java', 'lang'], edgeName: 'Float'} : {namespace: [], edgeName: 'float'};
      case OmniTypeKind.INTEGER:
        return boxed ? {namespace: ['java', 'lang'], edgeName: 'Integer'} : {namespace: [], edgeName: 'int'};
      case OmniTypeKind.INTEGER_SMALL:
        return boxed ? {namespace: ['java', 'lang'], edgeName: 'Short'} : {namespace: [], edgeName: 'short'};
      case OmniTypeKind.LONG:
        return boxed ? {namespace: ['java', 'lang'], edgeName: 'Long'} : {namespace: [], edgeName: 'long'};
      case OmniTypeKind.DECIMAL:
      case OmniTypeKind.DOUBLE:
        return boxed ? {namespace: ['java', 'lang'], edgeName: 'Double'} : {namespace: [], edgeName: 'double'};
      case OmniTypeKind.NUMBER:
        return boxed ? {namespace: ['java', 'lang'], edgeName: 'Number'} : {namespace: [], edgeName: 'double'};
      case OmniTypeKind.NULL:
      case OmniTypeKind.UNDEFINED:
        return {namespace: ['java', 'lang'], edgeName: 'Object'};
    }
  }

  protected createInterfaceName(innerEdgeName: string, options: JavaOptions) {
    return `${options.interfaceNamePrefix}${innerEdgeName}${options.interfaceNameSuffix}`;
  }

  protected getUnknownKind(type: OmniUnknownType, options: JavaOptions): UnknownKind {
    return type.unknownKind ?? options?.unknownType;
  }
}

export const JAVA_LANG_CLASSES = [
  'Appendable', 'AutoCloseable', 'CharSequence', 'Cloneable', 'Comparable', 'Iterable', 'Readable', 'Runnable', 'Boolean',
  'Byte', 'Character', 'Class', 'ClassLoader', 'ClassValue', 'Compiler', 'Double', 'Enum', 'Float', 'InheritableThreadLocal',
  'Integer', 'Long', 'Math', 'Number', 'Object', 'Package', 'Process', 'ProcessBuilder', 'Runtime', 'RuntimePermission',
  'SecurityManager', 'Short', 'StackTraceElement', 'StrictMath', 'String', 'StringBuffer', 'StringBuilder', 'System', 'Thread',
  'ThreadGroup', 'ThreadLocal', 'Throwable', 'Void',
];
