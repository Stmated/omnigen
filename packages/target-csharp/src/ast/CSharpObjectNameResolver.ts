import {AstNameBuildArgs, NameParts, ObjectName, OmniPrimitiveKinds, OmniPrimitiveType, OmniTypeKind, OmniUnknownType, PackageOptions, TargetOptions, TypeUseKind, UnknownKind} from '@omnigen/api';
import {AbstractObjectNameResolver, assertUnreachable} from '@omnigen/core';
import {CSharpOptions} from '../options';
import {CSharpUtil} from '../util/CSharpUtil.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export class CSharpObjectNameResolver extends AbstractObjectNameResolver<PackageOptions & TargetOptions & CSharpOptions> {

  namespaceSeparator = '.';

  isReservedWord(word: string): boolean {
    return CSHARP_RESERVED_WORDS.includes(word);
  }

  parse(fqn: string): ObjectName {
    throw new Error('Method not implemented.');
  }

  protected createInterfaceName(innerEdgeName: string, options: PackageOptions & TargetOptions & CSharpOptions): string {
    return `I${innerEdgeName}`;
  }

  build(args: AstNameBuildArgs): string {

    if (args.use === TypeUseKind.IMPORT && args.with === NameParts.FULL) {

      // In C# you import namespaces, and not the whole type path.
      // In theory this could cause type conflicts, and in the future there might be a need to check for those and create type aliases.
      const namespaceParts = Array.isArray(args.name) ? args.name : args.name.namespace;
      return this.relativize(namespaceParts, args.relativeTo, args.with, args.use);
    }

    return super.build(args);
  }

  protected getPrimitiveName(type: OmniPrimitiveType, kind: OmniPrimitiveKinds, boxed: boolean | undefined, options: CSharpOptions): ObjectName {

    boxed = boxed ?? CSharpUtil.isPrimitiveBoxed(type);

    if (kind == OmniTypeKind.NUMBER) {
      kind = OmniTypeKind.DOUBLE;
    }

    const suffix = boxed ? '?' : '';

    switch (kind) {
      case OmniTypeKind.BOOL:
        return {namespace: [], edgeName: `bool${suffix}`};
      case OmniTypeKind.VOID:
        return {namespace: [], edgeName: 'void'};
      case OmniTypeKind.CHAR:
        return {namespace: [], edgeName: `char${suffix}`};
      case OmniTypeKind.STRING:
        return {namespace: [], edgeName: 'string'};
      case OmniTypeKind.FLOAT:
        return {namespace: [], edgeName: `float${suffix}`};
      case OmniTypeKind.INTEGER:
        return {namespace: [], edgeName: `int${suffix}`};
      case OmniTypeKind.INTEGER_SMALL:
        return {namespace: [], edgeName: `short${suffix}`};
      case OmniTypeKind.LONG:
        return {namespace: [], edgeName: `long${suffix}`};
      case OmniTypeKind.DECIMAL:
        return {namespace: [], edgeName: `decimal${suffix}`};
      case OmniTypeKind.DOUBLE:
        return {namespace: [], edgeName: `double${suffix}`};
      case OmniTypeKind.NULL:
      case OmniTypeKind.UNDEFINED:
        return {namespace: [], edgeName: 'object'};
    }

    assertUnreachable(kind);
  }

  protected getUnknownKind(type: OmniUnknownType, options: CSharpOptions): UnknownKind {
    return type.unknownKind ?? options.unknownType;
  }

  protected getUnknownTypeString(unknownKind: UnknownKind): string {
    switch (unknownKind) {
      case UnknownKind.DYNAMIC_OBJECT:
        return `MutableObject`;
      case UnknownKind.DYNAMIC:
        return `MutableObject`;
      case UnknownKind.DYNAMIC_NATIVE:
        return `dynamic`;
      case UnknownKind.OBJECT:
        return 'object';
      case UnknownKind.ANY:
      case UnknownKind.WILDCARD:
        return 'dynamic';
    }
  }
}

const CSHARP_RESERVED_WORDS = [
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do',
  'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock',
  'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof',
  'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
];
