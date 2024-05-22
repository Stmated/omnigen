import {
  ObjectName,
  AstNameBuildArgs,
  ObjectNameResolveArgs,
  ObjectNameResolver, NameParts,
  Namespace,
  NamespaceArrayItem,
  OmniCompositionType,
  OmniPrimitiveKinds,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  Options, PackageOptions, TargetOptions,
  TypeName,
  TypeUseKind,
  UnknownKind,
} from '@omnigen/core';
import {Naming, OmniUtil} from '../parse';
import {assertUnreachable, Case} from '../util';

export abstract class AbstractObjectNameResolver<TOpt extends PackageOptions & TargetOptions & Options> implements ObjectNameResolver<TOpt> {

  protected abstract namespaceSeparator: string;

  public abstract isReservedWord(word: string): boolean;

  protected abstract createInterfaceName(innerEdgeName: string, options: TOpt): string;

  protected abstract getUnknownKind(type: OmniUnknownType, options: TOpt): UnknownKind;

  public abstract parse(fqn: string): ObjectName;

  protected abstract getPrimitiveName(type: OmniPrimitiveType, kind: OmniPrimitiveKinds, boxed: boolean | undefined, options: TOpt): ObjectName;

  protected toAstName(type: OmniType, edgeName: string, options: PackageOptions): ObjectName {

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

    // TODO: Rewrite this, so we do not have any of the code inside JavaUtil, instead moved into here

    if (OmniUtil.isPrimitive(args.type)) {
      return this.getPrimitiveName(args.type, args.type.kind, args.boxed, args.options);
    }

    switch (args.type.kind) {
      case OmniTypeKind.GENERIC_TARGET:
        // NOTE: This will not include the generics, only the actual type source name.
        return this.investigate({...args, type: args.type.source});
      case OmniTypeKind.GENERIC_SOURCE_IDENTIFIER:
        // The local name of a generic type is always just the generic type name.
        return this.toAstName(args.type, args.type.placeholderName, args.options);
      case OmniTypeKind.GENERIC_TARGET_IDENTIFIER:
        return this.toAstName(args.type, args.type.placeholderName || args.type.sourceIdentifier.placeholderName, args.options);
      case OmniTypeKind.ARRAY: {
        const itemName = this.investigate({...args, type: args.type.of});
        const name = `ArrayOf${itemName}`;
        return this.toAstName(args.type, name, args.options);
      }
      case OmniTypeKind.TUPLE: {
        // TODO: `[String, String, String]` should be `StringTriplet` and `[Integer, Integer, String]` should be `IntegerPairThenString`
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
        return this.toAstName(args.type, name, args.options);
      }
      case OmniTypeKind.UNKNOWN: {
        const unknownType = this.getUnknownKind(args.type, args.options);
        const unknownName = AbstractObjectNameResolver.getUnknownTypeString(unknownType);
        return this.toAstName(args.type, unknownName, args.options);
      }
      case OmniTypeKind.DICTIONARY:
        throw new Error(`Name resolver can only resolve edge types, and not dictionary types (that is up to the renderer)`);
      case OmniTypeKind.HARDCODED_REFERENCE:
        return {
          edgeName: this.cleanClassName(args.type.fqn, false),
          namespace: this.getPackageNameFromFqn(args.type.fqn),
        };
      case OmniTypeKind.INTERFACE:
        if (args.type.name) {
          const interfaceName = Naming.unwrap(args.type.name);
          return this.toAstName(args.type, interfaceName, args.options);
        } else {

          const innerName = this.investigate({...args, type: args.type.of});
          const innerEdgeName = innerName.edgeName;


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
        return this.toAstName(args.type, name, args.options);
      }
      case OmniTypeKind.UNION:
      case OmniTypeKind.EXCLUSIVE_UNION:
      case OmniTypeKind.INTERSECTION:
      case OmniTypeKind.NEGATION: {
        const compositionName = this.getCompositionClassName(args.type, args);
        const unwrappedCompositionName = Naming.unwrap(compositionName);
        return this.toAstName(args.type, unwrappedCompositionName, args.options);
      }
      case OmniTypeKind.GENERIC_SOURCE:
        return this.investigate({...args, type: args.type.of});
      case OmniTypeKind.EXTERNAL_MODEL_REFERENCE: {

        // This is a reference to another model.
        // It might be possible that this model has another option that what was given to this method.
        if (args.type.name) {

          const name = Naming.unwrap(args.type.name);
          const commonOptions = args.type.model.options as TOpt || args.options;
          // return JavaUtil.getClassNameWithPackageName(args.type, name, commonOptions, args.withPackage);
          return this.toAstName(args.type, name, commonOptions);
        }

        if (args.type.model.options) {

          // TODO: This way of handling it is INCREDIBLY UGLY -- need a way to make this actually typesafe!
          const commonOptions = args.type.model.options as TOpt;
          return this.investigate({...args, type: args.type.of, options: commonOptions});
        }

        return this.investigate({...args, type: args.type.of});
      }
    }
  }

  public build(args: AstNameBuildArgs): string {

    let ns: string | undefined;
    if (args.with === NameParts.NAMESPACE || args.with === NameParts.FULL) {

      const namespaceParts = Array.isArray(args.name) ? args.name : args.name.namespace;

      if (args.relativeTo) {

        const divergent = this.getDivergentNamespaceIndex(namespaceParts, args.relativeTo);
        if (divergent === -1) {
          // There is no difference. So we can just skip the namespace.
          ns = '';
        } else {

          // There is a difference. Java does not have relative namespace paths. So we use the full one.
          ns = namespaceParts.map(it => (typeof it === 'string') ? it : it.name).join(this.namespaceSeparator);
        }
      } else {

        // We do not want a relative path.
        ns = namespaceParts.map(it => (typeof it === 'string') ? it : it.name).join(this.namespaceSeparator);
      }

    } else {
      ns = undefined;
    }

    let name: string | undefined;
    if (args.with === NameParts.NAME || args.with === NameParts.FULL) {
      name = args.name.edgeName ?? '_';
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

  public parseNamespace(namespace: string): Namespace {
    return namespace.split(this.namespaceSeparator);
  }

  protected getDivergentNamespaceIndex(base: Namespace, other: Namespace): number {

    let i = 0;
    for (; i < base.length && i < other.length; i++) {
      if (AbstractObjectNameResolver.resolveNamespacePart(base[i]) !== AbstractObjectNameResolver.resolveNamespacePart(other[i])) {
        return i;
      }
    }

    if (base.length != other.length) {
      return i;
    }

    return -1;
  }

  protected static resolveNamespacePart(item: NamespaceArrayItem): string {
    return (typeof item === 'string') ? item : item.name;
  }

  /**
   * TODO: REMOVE! Should be handled by the later JavaRenderer, specific nodes for specific type
   */
  protected static getUnknownTypeString(unknownKind: UnknownKind): string {
    switch (unknownKind) {
      case UnknownKind.MUTABLE_OBJECT:
        return `MutableObject`;
      case UnknownKind.MAP:
        return `Map`;
      case UnknownKind.OBJECT:
      case UnknownKind.ANY:
        return 'Object';
      case UnknownKind.WILDCARD:
        return 'Wildcard';
    }
  }

  protected getCompositionClassName<T extends OmniType>(type: OmniCompositionType<T>, args: ObjectNameResolveArgs<TOpt>): TypeName {

    if (type.name) {
      return Naming.unwrap(type.name);
    }

    let prefix: TypeName;
    if (type.kind == OmniTypeKind.EXCLUSIVE_UNION) {
      prefix = ['UnionOf', 'ExclusiveUnionOf'];
    } else if (type.kind == OmniTypeKind.UNION) {
      prefix = 'UnionOf';
    } else if (type.kind == OmniTypeKind.INTERSECTION) {
      prefix = 'IntersectionOf';
    } else if (type.kind == OmniTypeKind.NEGATION) {
      prefix = 'NegationOf';
    } else {
      assertUnreachable(type);
    }

    const uniqueNames = [...new Set(type.types.map(it => {

      switch (it.kind) {
        case OmniTypeKind.NULL:
          return 'Null';
        case OmniTypeKind.UNDEFINED:
          return 'Undefined';
        case OmniTypeKind.ARRAY: {
          const itemName = this.investigate({...args, type: it.of, use: TypeUseKind.DECLARED, boxed: true}).edgeName;
          return `${itemName}Array`;
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
        name: uniqueNames[i],
      };
    }

    return name;
  }

  protected cleanClassName(fqn: string, withSuffix = true): string {

    const genericIdx = fqn.indexOf('<');
    if (!withSuffix) {
      if (genericIdx !== -1) {
        fqn = fqn.substring(0, genericIdx);
      }

      const idx = fqn.lastIndexOf(this.namespaceSeparator);
      if (idx == -1) {
        return fqn;
      } else {
        return fqn.substring(idx + 1);
      }
    } else {

      let suffix = '';
      if (genericIdx !== -1) {
        suffix = fqn.substring(genericIdx);
        fqn = fqn.substring(0, genericIdx);
      }

      const idx = fqn.lastIndexOf(this.namespaceSeparator);
      if (idx == -1) {
        return fqn + suffix;
      } else {
        return fqn.substring(idx + 1) + suffix;
      }
    }
  }

  protected getPackageNameFromFqn(fqn: string): string[] {
    const genericIdx = fqn.indexOf('<');
    if (genericIdx !== -1) {
      fqn = fqn.substring(0, genericIdx);
    }

    const idx = fqn.lastIndexOf(this.namespaceSeparator);
    if (idx !== -1) {
      return fqn.substring(0, idx).split(this.namespaceSeparator);
    }

    return [];
  }
}
