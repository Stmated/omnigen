import {
  AstNameBuildArgs,
  NameParts,
  Namespace, ObjectEdgeName,
  ObjectName,
  ObjectNameResolveArgs,
  ObjectNameResolver,
  OmniCompositionType,
  OmniPrimitiveKinds,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  Options,
  PackageOptions,
  TargetOptions,
  TypeName,
  TypeUseKind,
  UnknownKind,
} from '@omnigen/core';
import {Naming, OmniUtil} from '../parse';
import {assertUnreachable, Case} from '../util';

export abstract class AbstractObjectNameResolver<TOpt extends PackageOptions & TargetOptions & Options> implements ObjectNameResolver<TOpt> {

  public abstract namespaceSeparator: string;

  public abstract isReservedWord(word: string): boolean;

  protected abstract createInterfaceName(innerEdgeName: string, options: TOpt): string;

  protected abstract getUnknownKind(type: OmniUnknownType, options: TOpt): UnknownKind;

  public abstract parse(fqn: string): ObjectName;

  protected abstract getPrimitiveName(type: OmniPrimitiveType, kind: OmniPrimitiveKinds, boxed: boolean | undefined, options: TOpt): ObjectName;

  protected toObjectName(type: OmniType, edgeName: string, options: PackageOptions): ObjectName {

    let packageName: string;
    if (options.packageResolver) {
      packageName = options.packageResolver(type, edgeName, options);
    } else {
      packageName = options.package;
    }

    if (!packageName) {
      throw new Error(`Not allowed to have an empty package name for ${OmniUtil.describe(type)}`);
    }

    return {
      edgeName: edgeName,
      namespace: packageName.split(this.namespaceSeparator),
    };
  }

  public investigate(args: ObjectNameResolveArgs<TOpt>): ObjectName {

    if (OmniUtil.isPrimitive(args.type)) {
      return this.getPrimitiveName(args.type, args.type.kind, args.boxed, args.options);
    }

    switch (args.type.kind) {
      case OmniTypeKind.GENERIC_TARGET:
        // NOTE: This will not include the generics, only the actual type source name.
        return this.investigate({...args, type: args.type.source});
      case OmniTypeKind.GENERIC_SOURCE_IDENTIFIER:
        // The local name of a generic type is always just the generic type name.
        return this.toObjectName(args.type, args.type.placeholderName, args.options);
      case OmniTypeKind.GENERIC_TARGET_IDENTIFIER:
        return this.toObjectName(args.type, args.type.placeholderName || args.type.sourceIdentifier.placeholderName, args.options);
      case OmniTypeKind.ARRAY: {
        const itemName = this.investigate({...args, type: args.type.of});
        const name = `ArrayOf${itemName}`;
        return this.toObjectName(args.type, name, args.options);
      }
      case OmniTypeKind.TUPLE: {
        // TODO: `[String, String, String]` should be `StringTriplet` and `[Integer, Integer, String]` should be `IntegerPairThenString`
        // TODO: This should be output as just `(String, String String)` in languages like C# that supports tuples
        const itemNames = args.type.types.map(it => this.investigate({...args, type: it}));
        const name = `TupleOf${itemNames.map(it => it.edgeName).join('')}`;
        return {
          edgeName: name,
          namespace: itemNames[0].namespace,
        };
      }
      case OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION: {
        const itemNames = args.type.properties.map(it => OmniUtil.getPropertyName(it.name, true) ?? 'ERROR');
        const name = `PositionalOf${itemNames.map(it => Case.pascal(it)).join('')}`;
        return this.toObjectName(args.type, name, args.options);
      }
      case OmniTypeKind.UNKNOWN: {
        const unknownType = this.getUnknownKind(args.type, args.options);
        const unknownName = this.getUnknownTypeString(unknownType);
        return this.toObjectName(args.type, unknownName, args.options);
      }
      case OmniTypeKind.DICTIONARY:
        throw new Error(`Name resolver can only resolve edge types, and not dictionary types (that is up to the renderer)`);
      case OmniTypeKind.HARDCODED_REFERENCE:
        return args.type.fqn;
      case OmniTypeKind.INTERFACE:
        if (args.type.name) {
          const interfaceName = Naming.unwrap(args.type.name);
          return this.toObjectName(args.type, interfaceName, args.options);
        } else {

          const innerName = this.investigate({...args, type: args.type.of});
          const innerEdgeName = OmniUtil.resolveObjectEdgeName(innerName.edgeName, args.use);
          const interfaceName = this.createInterfaceName(innerEdgeName, args.options);
          return {
            ...innerName,
            edgeName: interfaceName,
          };
        }
      case OmniTypeKind.DECORATING:
        return this.investigate({...args, type: args.type.of});
      case OmniTypeKind.ENUM:
      case OmniTypeKind.OBJECT: {
        const name = Naming.unwrap(args.type.name);
        return this.toObjectName(args.type, name, args.options);
      }
      case OmniTypeKind.UNION:
      case OmniTypeKind.EXCLUSIVE_UNION:
      case OmniTypeKind.INTERSECTION:
      case OmniTypeKind.NEGATION: {
        const compositionName = this.getCompositionClassName(args.type, args);
        const unwrappedCompositionName = Naming.unwrap(compositionName);
        return this.toObjectName(args.type, unwrappedCompositionName, args.options);
      }
      case OmniTypeKind.GENERIC_SOURCE:
        return this.investigate({...args, type: args.type.of});
      case OmniTypeKind.EXTERNAL_MODEL_REFERENCE: {

        // This is a reference to another model.
        // It might be possible that this model has another option that what was given to this method.
        if (args.type.name) {

          const name = Naming.unwrap(args.type.name);
          const commonOptions = /* args.type.model.options as TOpt ||*/ args.options;
          return this.toObjectName(args.type, name, commonOptions);
        }

        // if (args.type.model.options) {
        //
        //   // TODO: This way of handling it is INCREDIBLY UGLY -- need a way to make this actually typesafe!
        //   const commonOptions = args.type.model.options as TOpt;
        //   return this.investigate({...args, type: args.type.of, options: commonOptions});
        // }

        return this.investigate({...args, type: args.type.of});
      }
    }
  }

  public build(args: AstNameBuildArgs): string {

    let ns: string | undefined;
    if (args.with === NameParts.NAMESPACE || args.with === NameParts.FULL) {
      const namespaceParts = Array.isArray(args.name) ? args.name : args.name.namespace;
      ns = this.relativize(namespaceParts, args.relativeTo, args.with, args.use);
    } else {
      ns = undefined;
    }

    let name: string | undefined;
    if (args.with === NameParts.NAME || args.with === NameParts.FULL) {
      name = OmniUtil.resolveObjectEdgeName(args.name.edgeName, args.use);
    } else {
      name = undefined;
    }

    if (args.with === NameParts.FULL && ns && name) {
      return `${ns}${this.namespaceSeparator}${name}`;
    } else if (args.with === NameParts.FULL && name && !ns) {
      return name;
    } else if (args.with === NameParts.NAMESPACE && ns) {
      return ns;
    } else if (args.with === NameParts.NAME && name) {
      return name;
    }

    throw new Error(`Could not get any name for ${JSON.stringify(args)}`);
  }

  protected relativize(namespaceParts: Namespace, relativeTo: Namespace | undefined, w: NameParts, u: TypeUseKind | undefined): string {

    // TODO: Make this work properly for TypeScript -- it should not always do relative paths just because given a `relativeTo`, it is up to the target language and how it is used

    if (relativeTo) {
      const divergent = AbstractObjectNameResolver.getDivergentNamespaceIndex(namespaceParts, relativeTo);
      if (divergent === -1) {
        // There is no difference. So we can just skip the namespace.
        return '';
      } else {

        // There is a difference. Java does not have relative namespace paths. So we use the full one.
        return namespaceParts.map(it => (typeof it === 'string') ? it : it.name).join(this.namespaceSeparator);
      }
    } else {
      // We do not want a relative path.
      return namespaceParts.map(it => (typeof it === 'string') ? it : it.name).join(this.namespaceSeparator);
    }
  }

  public parseNamespace(namespace: string): Namespace {
    return namespace.split(this.namespaceSeparator);
  }

  isEqual(a: ObjectName | undefined, b: ObjectName | undefined): boolean {
    return OmniUtil.isEqualObjectName(a, b);
  }

  public isEqualNamespace(a: Namespace | undefined, b: Namespace | undefined): boolean {
    return OmniUtil.isEqualNamespace(a, b);
  }

  public startsWithNamespace(ns: ObjectName | Namespace | undefined, comparedTo: ObjectName | Namespace | undefined): boolean {
    return OmniUtil.startsWithNamespace(ns, comparedTo);
  }

  protected static getDivergentNamespaceIndex(base: Namespace, other: Namespace): number {

    let i = 0;
    for (; i < base.length && i < other.length; i++) {
      if (OmniUtil.resolveNamespacePart(base[i]) !== OmniUtil.resolveNamespacePart(other[i])) {
        return i;
      }
    }

    if (base.length != other.length) {
      return i;
    }

    return -1;
  }

  protected getUnknownTypeString(unknownKind: UnknownKind): string {
    switch (unknownKind) {
      case UnknownKind.DYNAMIC_OBJECT:
        return `DynamicObject`;
      case UnknownKind.DYNAMIC:
        return 'Dynamic';
      case UnknownKind.DYNAMIC_NATIVE:
        return 'DynamicNative';
      case UnknownKind.OBJECT:
      case UnknownKind.ANY:
        return 'Object';
      case UnknownKind.WILDCARD:
        return 'Wildcard';
    }
  }

  protected getCompositionClassName(type: OmniCompositionType, args: ObjectNameResolveArgs<TOpt>): TypeName {

    if (type.name) {
      return Naming.unwrap(type.name);
    }

    let prefix: TypeName;
    if (type.kind == OmniTypeKind.EXCLUSIVE_UNION) {
      prefix = ['UnionOf', 'ExclusiveUnionOf'];
    } else if (type.kind == OmniTypeKind.UNION) {

      if (type.types.length == 2) {
        const arrayType = type.types.find(it => it.kind === OmniTypeKind.ARRAY);
        if (arrayType) {
          const itemType = type.types.find(it => it == arrayType.of);
          if (itemType) {
            const itemName = this.investigate({...args, type: itemType, use: TypeUseKind.DECLARED, boxed: true}).edgeName;
            const resolved = OmniUtil.resolveObjectEdgeName(itemName, TypeUseKind.DECLARED);
            return {
              prefix: 'Arrayable',
              name: resolved,
            };
          }
        }
      }

      prefix = 'UnionOf';
    } else if (type.kind == OmniTypeKind.INTERSECTION) {
      prefix = 'IntersectionOf';
    } else if (type.kind == OmniTypeKind.NEGATION) {
      prefix = 'NegationOf';
    } else {
      assertUnreachable(type);
    }

    const uniqueNames: ObjectEdgeName[] = [...new Set(type.types.map(it => {

      switch (it.kind) {
        case OmniTypeKind.NULL:
          return 'Null';
        case OmniTypeKind.UNDEFINED:
          return 'Undefined';
        case OmniTypeKind.ARRAY: {
          const itemName = this.investigate({...args, type: it.of, use: TypeUseKind.DECLARED, boxed: true}).edgeName;
          return `${OmniUtil.resolveObjectEdgeName(itemName, TypeUseKind.DECLARED)}Array`;
        }
        default:
          return this.investigate({...args, type: it, use: TypeUseKind.DECLARED, boxed: true}).edgeName;
      }

    }))];

    let name: TypeName = {
      name: prefix,
    };

    for (let i = 0; i < uniqueNames.length; i++) {
      name = {
        prefix: name,
        name: OmniUtil.resolveObjectEdgeName(uniqueNames[i], args.use),
      };
    }

    return name;
  }

  // protected cleanClassName(fqn: string, withSuffix = true): string {
  //
  //   const genericIdx = fqn.indexOf('<');
  //   if (!withSuffix) {
  //     if (genericIdx !== -1) {
  //       fqn = fqn.substring(0, genericIdx);
  //     }
  //
  //     const idx = fqn.lastIndexOf(this.namespaceSeparator);
  //     if (idx == -1) {
  //       return fqn;
  //     } else {
  //       return fqn.substring(idx + 1);
  //     }
  //   } else {
  //
  //     let suffix = '';
  //     if (genericIdx !== -1) {
  //       suffix = fqn.substring(genericIdx);
  //       fqn = fqn.substring(0, genericIdx);
  //     }
  //
  //     const idx = fqn.lastIndexOf(this.namespaceSeparator);
  //     if (idx == -1) {
  //       return fqn + suffix;
  //     } else {
  //       return fqn.substring(idx + 1) + suffix;
  //     }
  //   }
  // }
  //
  // protected getPackageNameFromFqn(fqn: string): string[] {
  //   const genericIdx = fqn.indexOf('<');
  //   if (genericIdx !== -1) {
  //     fqn = fqn.substring(0, genericIdx);
  //   }
  //
  //   const idx = fqn.lastIndexOf(this.namespaceSeparator);
  //   if (idx !== -1) {
  //     return fqn.substring(0, idx).split(this.namespaceSeparator);
  //   }
  //
  //   return [];
  // }
}
