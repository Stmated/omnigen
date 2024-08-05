import {ObjectName, OmniPrimitiveKinds, OmniPrimitiveType, OmniType, OmniTypeKind, OmniUnknownType, PackageOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {AbstractObjectNameResolver} from '@omnigen/core';
import {TypeScriptOptions} from '../options';

export class TypeScriptObjectNameResolver extends AbstractObjectNameResolver<PackageOptions & TargetOptions & TypeScriptOptions> {

  namespaceSeparator = '/';

  isReservedWord(word: string): boolean {
    return TS_RESERVED_WORDS.includes(word);
  }

  parse(fqn: string): ObjectName {
    throw new Error('Method not implemented.');
  }

  protected toObjectName(type: OmniType, edgeName: string, options: PackageOptions): ObjectName {

    const objectName = super.toObjectName(type, edgeName, options);
    if (objectName.namespace.length === 1 && typeof objectName.namespace[0] === 'string') {

      const ns = objectName.namespace[0];
      if (ns.includes('.') && !ns.includes('/')) {
        return {
          edgeName: objectName.edgeName,
          namespace: ns.split('.'),
        };
      }
    }

    return objectName;
  }

  protected createInterfaceName(innerEdgeName: string, options: PackageOptions & TargetOptions & TypeScriptOptions): string {
    return `I${innerEdgeName}`;
  }

  protected getPrimitiveName(type: OmniPrimitiveType, kind: OmniPrimitiveKinds, boxed: boolean | undefined, options: TypeScriptOptions): ObjectName {

    // In a way this is slightly "wrong" -- since it would need to be `number | undefined` or similar for boxed/nullable types.
    // But that will need to be handled by some other code, to make the nullable type a union.

    switch (kind) {
      case OmniTypeKind.BOOL:
        return boxed ? {namespace: [], edgeName: 'Boolean'} : {namespace: [], edgeName: 'boolean'};
      case OmniTypeKind.VOID:
        return {namespace: [], edgeName: 'void'};
      case OmniTypeKind.CHAR:
        return {namespace: [], edgeName: 'string'};
      case OmniTypeKind.STRING:
        return {namespace: [], edgeName: 'string'};
      case OmniTypeKind.FLOAT:
      case OmniTypeKind.INTEGER:
      case OmniTypeKind.INTEGER_SMALL:
      case OmniTypeKind.LONG:
      case OmniTypeKind.DECIMAL:
      case OmniTypeKind.DOUBLE:
      case OmniTypeKind.NUMBER:
        return {namespace: [], edgeName: 'number'};
      case OmniTypeKind.NULL:
      case OmniTypeKind.UNDEFINED:
        return {namespace: [], edgeName: 'object'};
    }
  }

  protected getUnknownKind(type: OmniUnknownType, options: TypeScriptOptions): UnknownKind {
    return type.unknownKind ?? options.unknownType;
  }
}

const TS_RESERVED_WORDS: string[] = [
  // Reserved Words
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export',
  'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super',
  'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with',

  // Strict Mode Reserved Words
  'as', 'implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield',

  // Contextual Keywords
  'any', 'boolean', 'constructor', 'declare', 'get', 'module', 'require', 'number', 'set', 'string', 'symbol', 'type', 'from', 'of',
];
