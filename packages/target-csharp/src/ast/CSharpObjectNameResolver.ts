import {AstNameBuildArgs, NameParts, ObjectName, OmniPrimitiveKinds, OmniPrimitiveType, OmniTypeKind, OmniUnknownType, PackageOptions, TargetOptions, TypeUseKind, UnknownKind} from '@omnigen/core';
import {AbstractObjectNameResolver} from '@omnigen/core-util';
import {CSharpOptions} from '../options';
import {CSharpUtil} from '../util/CSharpUtil.ts';

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

    switch (kind) {
      case OmniTypeKind.BOOL:
        return boxed ? {namespace: ['System'], edgeName: 'Boolean'} : {namespace: [], edgeName: 'boolean'};
      case OmniTypeKind.VOID:
        return {namespace: [], edgeName: 'void'};
      case OmniTypeKind.CHAR:
        return boxed ? {namespace: ['System'], edgeName: 'Char'} : {namespace: [], edgeName: 'char'};
      case OmniTypeKind.STRING:
        return {namespace: ['System'], edgeName: 'String'};
      case OmniTypeKind.FLOAT:
        return boxed ? {namespace: ['System'], edgeName: 'Single'} : {namespace: [], edgeName: 'float'};
      case OmniTypeKind.INTEGER:
        return boxed ? {namespace: ['System'], edgeName: 'Int32'} : {namespace: [], edgeName: 'int'};
      case OmniTypeKind.INTEGER_SMALL:
        return boxed ? {namespace: ['System'], edgeName: 'Int16'} : {namespace: [], edgeName: 'short'};
      case OmniTypeKind.LONG:
        return boxed ? {namespace: ['System'], edgeName: 'Int64'} : {namespace: [], edgeName: 'long'};
      case OmniTypeKind.DECIMAL:
        return boxed ? {namespace: ['System'], edgeName: 'Decimal'} : {namespace: [], edgeName: 'decimal'};
      case OmniTypeKind.DOUBLE:
        return boxed ? {namespace: ['System'], edgeName: 'Double'} : {namespace: [], edgeName: 'double'};
      case OmniTypeKind.NULL:
      case OmniTypeKind.UNDEFINED:
        return {namespace: ['System'], edgeName: 'Object'};
    }
  }

  protected getUnknownKind(type: OmniUnknownType, options: CSharpOptions): UnknownKind {
    return type.unknownKind ?? options.unknownType;
  }
}

const CSHARP_RESERVED_WORDS = [
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do',
  'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock',
  'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof',
  'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
];
