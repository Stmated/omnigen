import {
  CompositionKind,
  IOmniArrayType,
  IOmniDictionaryType,
  IOmniExternalModelReferenceType,
  Naming,
  IOmniArrayPropertiesByPositionType,
  IOmniGenericTargetIdentifierType,
  IOmniGenericTargetType,
  OmniInheritableType,
  IOmniModel,
  OmniPrimitiveConstantValue,
  OmniPrimitiveConstantValueOrLazySubTypeValue,
  OmniPrimitiveKind,
  IOmniPrimitiveType,
  IOmniProperty,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  PrimitiveNullableKind,
  TypeName,
} from '../parse';
import {LiteralValue} from './LiteralValue';

export interface ITypeCollection {

  named: OmniType[];
  all: OmniType[];
  edge: OmniType[];
}

type TargetIdentifierTuple = { a: IOmniGenericTargetIdentifierType, b: IOmniGenericTargetIdentifierType };

export type TraverseInput = OmniType | OmniType[] | undefined;
export type TraverseCallbackResult = 'abort' | 'skip' | void;
export type TraverseCallback = { (type: OmniType, depth: number): TraverseCallbackResult };

export class OmniUtil {

  public static getAllExportableTypes(model: IOmniModel, refTypes?: OmniType[]): ITypeCollection {

    // TODO: Should be an option to do a deep dive or a quick dive!
    const set = new Set<OmniType>();
    const setEdge = new Set<OmniType>();
    if (refTypes) {
      for (const refType of refTypes) {
        OmniUtil.getTypesRecursively(refType, set, setEdge, 0);
      }
    }

    model.endpoints.forEach(e => {
      OmniUtil.getTypesRecursively(e.request.type, set, setEdge, 0);

      e.responses.forEach(r => {
        OmniUtil.getTypesRecursively(r.type, set, setEdge, 0);
      });
    });
    (model.continuations || []).forEach(c => {
      c.mappings.forEach(m => {
        (m.source.propertyPath || []).forEach(p => {
          OmniUtil.getTypesRecursively(p.owner, set, setEdge, 1);
          OmniUtil.getTypesRecursively(p.type, set, setEdge, 1);
        });
        (m.target.propertyPath || []).forEach(p => {
          OmniUtil.getTypesRecursively(p.owner, set, setEdge, 1);
          OmniUtil.getTypesRecursively(p.type, set, setEdge, 1);
        });
      });
    });

    return {
      all: [...set],
      edge: [...setEdge],
      named: [],
    };
  }

  public static isGenericAllowedType(type: OmniType): boolean {
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.primitiveKind == OmniPrimitiveKind.STRING) {
        return true;
      }

      switch (type.nullable) {
        case PrimitiveNullableKind.NULLABLE:
        case PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE:
          return true;
        default:
          return false;
      }
    }

    return true;
  }

  public static isAssignableTo(type: TraverseInput, needle: OmniType): boolean {

    const result: { value: boolean } = {value: false};
    OmniUtil.traverseTypesInternal(type, 0, localType => {

      if (localType.kind == OmniTypeKind.GENERIC_TARGET) {
        return 'skip';
      }

      if (localType == needle) {
        result.value = true;
        return 'abort';
      }

      return undefined;
    });

    return result.value;
  }

  /**
   * Resolves the type into the local visible type(s).
   * This means the types that are externally visible for this type.
   * For example:
   * - If an object, then the object itself.
   * - If an array, then the array type and item type(s).
   * - If a generic, then the generic type itself and the generic target types.
   *
   * This is used to know if the type will be output into the compilation unit/source code.
   * That way we can know if this type is hard-linked to a certain source code.
   *
   * NOTE: This might not be correct for all future target languages.
   *        Might need to be looked at in the future.
   *
   * @param type
   */
  public static getResolvedVisibleTypes(type: OmniType): OmniType[] {

    if (type.kind == OmniTypeKind.ARRAY) {
      return [type, ...OmniUtil.getResolvedVisibleTypes(type.of)];
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      const sourceType = OmniUtil.getResolvedVisibleTypes(type.source.of);
      const targetTypes = type.targetIdentifiers.flatMap(it => OmniUtil.getResolvedVisibleTypes(it.type));
      return [...sourceType, ...targetTypes];
    }

    // Should we follow external model references here?

    return [type];
  }

  /**
   * Resolves the type into its edge type, that is the innermost type that contains the functionality of the type.
   * The returned type can be a completely other type than the given one, following interface and/or external references.
   *
   * @param type
   */
  public static getResolvedEdgeType(type: OmniType): OmniType {

    const unwrappedType = OmniUtil.getUnwrappedType(type);
    if (unwrappedType.kind == OmniTypeKind.ARRAY) {
      return OmniUtil.getResolvedEdgeType(unwrappedType.of);
    }

    if (unwrappedType.kind == OmniTypeKind.INTERFACE) {
      // NOTE: Should this be included?
      return OmniUtil.getResolvedEdgeType(unwrappedType.of);
    }

    return unwrappedType;
  }

  /**
   * Gets the actual type of the given type, giving back the first type that is not a hollow reference to another type.
   * The returned type might not be located in the same model as the given type.
   *
   * @param type
   */
  public static getUnwrappedType(type: OmniType): Exclude<OmniType, IOmniExternalModelReferenceType<any>> {

    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return OmniUtil.getUnwrappedType(type.of);
    }

    return type;
  }

  public static traverseTypes(type: TraverseInput, callback: TraverseCallback): void {
    OmniUtil.traverseTypesInternal(type, 0, undefined, callback);
  }

  private static traverseTypesInternal(
    type: TraverseInput,
    depth: number,
    onDown?: TraverseCallback,
    onUp?: TraverseCallback,
  ): TraverseCallbackResult {

    if (!type) return;

    if (Array.isArray(type)) {
      for (const entry of type) {
        const entryResult = OmniUtil.traverseTypesInternal(entry, depth, onDown, onUp);
        if (entryResult == 'abort') {
          return 'abort';
        }
      }
      return;
    }

    if (onDown) {
      switch (onDown(type, depth)) {
        case 'abort':
          return 'abort';
        case 'skip':
          // 'skip' will not be propagated, but will simply not go deeper.
          return 'skip';
      }
    }

    if (type.kind == OmniTypeKind.OBJECT) {
      if (this.traverseTypesInternal(type.extendedBy, depth + 1, onDown, onUp) == 'abort') return 'abort';
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, onDown, onUp) == 'abort') return 'abort';
      }
    } else if (type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      if (this.traverseTypesInternal(type.types, depth, onDown, onUp) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.commonDenominator, depth, onDown, onUp) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, onDown, onUp) == 'abort') return 'abort';
      }
      if (this.traverseTypesInternal(type.commonDenominator, depth, onDown, onUp) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.COMPOSITION) {
      if (type.compositionKind == CompositionKind.AND) {
        if (this.traverseTypesInternal(type.andTypes, depth + 1, onDown, onUp) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.OR) {
        if (this.traverseTypesInternal(type.orTypes, depth + 1, onDown, onUp) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.XOR) {
        if (this.traverseTypesInternal(type.xorTypes, depth + 1, onDown, onUp) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.NOT) {
        if (this.traverseTypesInternal(type.notTypes, depth + 1, onDown, onUp) == 'abort') return 'abort';
      }
    } else if (type.kind == OmniTypeKind.ARRAY) {
      if (this.traverseTypesInternal(type.of, depth, onDown, onUp) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.DICTIONARY) {
      if (this.traverseTypesInternal(type.keyType, depth, onDown, onUp) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.valueType, depth, onDown, onUp) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      // if (this.traverseTypesInternal(type.of, depth, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.sourceIdentifiers, depth, onDown, onUp) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      if (this.traverseTypesInternal(type.targetIdentifiers, depth, onDown, onUp) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      if (this.traverseTypesInternal(type.type, depth, onDown, onUp) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
      if (this.traverseTypesInternal(type.lowerBound, depth, onDown, onUp) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.upperBound, depth, onDown, onUp) == 'abort') return 'abort';
    }

    if (onUp) {
      switch (onUp(type, depth)) {
        case 'abort':
          return 'abort';
        case 'skip':
          // 'skip' will not be propagated, but will simply not go deeper.
          return 'skip';
      }
    }
  }

  private static getTypesRecursively(type: TraverseInput, target: Set<OmniType>, edge: Set<OmniType>, depth: number): void {
    OmniUtil.traverseTypesInternal(type, depth, undefined, (localType, depth) => {
      target.add(localType);
      if (depth == 0) {
        edge.add(localType);
      }
    });
  }

  public static asInheritableType(type: OmniType): OmniInheritableType | undefined {

    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {

      const resolvedType = OmniUtil.getUnwrappedType(type);
      const asInheritable = OmniUtil.asInheritableType(resolvedType);
      if (asInheritable) {
        // NOTE: This cast should not exist here, work needs to be done to make this all-the-way generic.
        return type as OmniInheritableType;
      } else {
        return undefined;
      }
    }

    if (type.kind == OmniTypeKind.OBJECT
      || type.kind == OmniTypeKind.GENERIC_TARGET
      || type.kind == OmniTypeKind.COMPOSITION
      || type.kind == OmniTypeKind.ENUM
      || type.kind == OmniTypeKind.INTERFACE) {
      return type;
    }

    return undefined;
  }

  /**
   * Not recursive
   *
   * @param type
   */
  public static getPropertiesOf(type: OmniType): IOmniProperty[] {

    if (type.kind == OmniTypeKind.OBJECT) {
      return type.properties;
    }

    if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

      // This could quickly become very wonky if the properties are simply added to an interface?
      // Or is this handled by some other code, to convert it properly with index to the correct setter/constructor?
      return type.properties;
    }

    return [];
  }

  private static traverseHierarchy(type: TraverseInput, depth: number, callback: TraverseCallback): TraverseCallbackResult {

    if (!type) return;
    if (Array.isArray(type)) {
      for (const entry of type) {
        const entryResult = OmniUtil.traverseTypesInternal(entry, depth, undefined, callback);
        if (entryResult == 'abort') {
          return 'abort';
        }
      }
      return;
    }

    // Callback self, and then try to find recursive types.
    switch (callback(type, depth)) {
      case 'abort':
        return 'abort';
      case 'skip':
        // 'skip' will not be propagated, but will simply not go deeper.
        return 'skip';
    }

    if (type.kind == OmniTypeKind.OBJECT) {
      if (this.traverseTypesInternal(type.extendedBy, depth + 1, undefined, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      if (this.traverseTypesInternal(type.types, depth, undefined, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, undefined, callback) == 'abort') return 'abort';
      }
      if (this.traverseTypesInternal(type.commonDenominator, depth, undefined, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.COMPOSITION) {
      if (type.compositionKind == CompositionKind.AND) {
        if (this.traverseTypesInternal(type.andTypes, depth + 1, undefined, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.OR) {
        if (this.traverseTypesInternal(type.orTypes, depth + 1, undefined, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.XOR) {
        if (this.traverseTypesInternal(type.xorTypes, depth + 1, undefined, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.NOT) {
        // TODO: How to tell consumer that this is a NEGATION?!
        // if (this.traverseTypesInternal(type.notTypes, depth + 1, callback) == 'abort') return 'abort';
      }
    }
  }

  public static getClosestProperty(type: OmniType, propertyName: string): IOmniProperty | undefined {

    const reference: { property?: IOmniProperty } = {};
    OmniUtil.traverseHierarchy(type, 0, localType => {
      const property = OmniUtil.getPropertiesOf(localType).find(it => it.name == propertyName);
      if (property) {
        reference.property = property;
        return 'abort';
      }

      return undefined;
    });

    return reference.property;
  }

  public static getTypesThatInheritFrom(model: IOmniModel, type: OmniType): OmniType[] {

    const types: OmniType[] = [];

    // TODO: Make a visitor version of getAllExportableTypes? Less useless memory consumption.
    const exportableTypes = OmniUtil.getAllExportableTypes(model);

    // TODO: getAllExportableTypes should already include all model.types???
    const allTypes = new Set(exportableTypes.all.concat(model.types));

    for (const localType of allTypes) {
      if (localType.kind == OmniTypeKind.OBJECT) {
        if (localType.extendedBy == type) {
          types.push(localType);
        }
      }
    }

    return types;
  }

  public static toLiteralValue(value: unknown): LiteralValue {

    if (typeof value == 'string') {
      return value;
    } else if (typeof value == 'number') {
      return value;
    } else if (typeof value == 'boolean') {
      return value;
    } else {
      return String(value);
    }
  }

  /**
   * Does not take into account any type that this type extends from.
   * Only checks the direct type, if it is empty and could in theory be removed.
   *
   * @param type The generic type to check if it counts as empty.
   * @returns true if the type counts as empty, otherwise false.
   */
  public static isEmptyType(type: OmniType): boolean {

    if (type.kind == OmniTypeKind.OBJECT) {
      if (type.properties.length == 0 && (type.additionalProperties == undefined || !type.additionalProperties)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns a general name for the primitive.
   * Does not translate into the actual target language's primitive type.
   * Is used for generating property names or used in general logging.
   *
   * @param kind
   * @param nullable
   */
  public static getPrimitiveKindName(kind: OmniPrimitiveKind, nullable: boolean): string {

    switch (kind) {
      case OmniPrimitiveKind.BOOL:
        return nullable ? 'Boolean' : 'bool';
      case OmniPrimitiveKind.VOID:
        return 'void';
      case OmniPrimitiveKind.CHAR:
        return nullable ? 'Character' : 'char';
      case OmniPrimitiveKind.STRING:
        return nullable ? 'String' : 'string';
      case OmniPrimitiveKind.FLOAT:
        return nullable ? 'Float' : 'float';
      case OmniPrimitiveKind.INTEGER:
        return nullable ? 'Integer' : 'int';
      case OmniPrimitiveKind.INTEGER_SMALL:
        return nullable ? 'Short' : 'short';
      case OmniPrimitiveKind.LONG:
        return nullable ? 'Long' : 'long';
      case OmniPrimitiveKind.DECIMAL:
        return nullable ? 'Decimal' : 'decimal';
      case OmniPrimitiveKind.DOUBLE:
        return nullable ? 'Double' : 'double';
      case OmniPrimitiveKind.NUMBER:
        return nullable ? 'Number' : 'number';
    }
  }

  public static isNullable(nullableKind: PrimitiveNullableKind | undefined): boolean {
    return (nullableKind == PrimitiveNullableKind.NULLABLE);
  }

  /**
   * Gives the name of the type, or a description which describes the type.
   * Should only ever be used for logging or comments or other non-essential things.
   *
   * @param type
   */
  public static getTypeDescription(type: OmniType): string {

    // TODO: Implement, and use for all logging instead of Naming.xyz
    const baseName = Naming.safe(OmniUtil.getVirtualTypeName(type));
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.valueConstant) {
        const resolved = OmniUtil.resolvePrimitiveConstantValue(type.valueConstant, type);
        const resolvedString = OmniUtil.primitiveConstantValueToString(resolved);
        return `[${baseName}=${resolvedString}]`;
      }
    }

    return baseName;
  }

  public static primitiveConstantValueToString(value: OmniPrimitiveConstantValue): string {
    if (typeof value == 'string') {
      return value;
    } else {
      return String(value);
    }
  }

  public static resolvePrimitiveConstantValue(
    value: OmniPrimitiveConstantValueOrLazySubTypeValue,
    subType: OmniType,
  ): OmniPrimitiveConstantValue {

    if (typeof value == 'function') {
      return value(subType); // TODO: Check if this is correct
    } else {
      return value;
    }
  }

  /**
   * Gets the name of the type, or returns 'undefined' if the type is not named.
   *
   * @param type The type to try and find a name for
   */
  public static getTypeName(type: OmniType): TypeName | undefined {

    if ('name' in type && type.name) {
      return type.name;
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return OmniUtil.getTypeName(type.source);
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      return OmniUtil.getTypeName(type.of);
    } else if (type.kind == OmniTypeKind.INTERFACE) {
      return OmniUtil.getTypeName(type.of);
    } else if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return OmniUtil.getTypeName(type.of);
    }

    return undefined;
  }

  public static getVirtualTypeName(type: OmniType): TypeName {

    const typeName = OmniUtil.getTypeName(type);
    if (typeName) {
      return typeName;
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return fn => `ArrayOf${Naming.safe(OmniUtil.getVirtualTypeName(type.of), fn)}`;
    } else if (type.kind == OmniTypeKind.PRIMITIVE) {
      const nullable = OmniUtil.isNullable(type.nullable);
      return OmniUtil.getPrimitiveKindName(type.primitiveKind, nullable);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.valueConstant != undefined) {
        return OmniUtil.primitiveConstantValueToString(type.valueConstant);
      }
      if (type.isAny) {
        return '_any';
      }
      return '_unknown';
    } else if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return fn => `${Naming.safe(OmniUtil.getVirtualTypeName(type.of), fn)}From${type.model.name}`;
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      const rawName = OmniUtil.getVirtualTypeName(type);
      const genericTypes = type.targetIdentifiers.map(it => OmniUtil.getVirtualTypeName(it));
      const genericTypeString = genericTypes.join(', ');
      return fn => `${Naming.safe(rawName, fn)}<${genericTypeString}>`;
    } else if (type.kind == OmniTypeKind.DICTIONARY) {

      // TODO: Convert this into a generic type instead! Do NOT rely on this UGLY hardcoded string method!
      // const mapClassOrInterface = args.implementation == false ? 'Map' : 'HashMap';
      // const mapClass = !args.withPackage ? mapClassOrInterface : `java.util.${mapClassOrInterface}`;
      // if (args.withSuffix === false) {
      //   return mapClass;
      // } else {
      const keyName = OmniUtil.getVirtualTypeName(type.keyType);
      const valueName = OmniUtil.getVirtualTypeName(type.valueType);
      return fn => `[${Naming.safe(keyName, fn)}: ${Naming.safe(valueName, fn)}]`;
      // }
    }

    // TODO: All types should be able to return a "virtual" type name, which can be used for compositions or whatever!
    return `[ERROR: ADD VIRTUAL TYPE NAME FOR ${String(type.kind)}]`;
  }

  public static toGenericAllowedType(type: OmniType, wrap: boolean): OmniType {
    // Same thing for now, might change in the future.
    return OmniUtil.toNullableType(type, wrap);
  }

  public static toNullableType<T extends OmniType>(type: T, wrap: boolean): T | IOmniPrimitiveType {
    // NOTE: If changed, make sure isNullable is updated
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.nullable || type.primitiveKind == OmniPrimitiveKind.STRING) {
        return type;
      }

      const nullablePrimitive: IOmniPrimitiveType = {
        ...type,
        nullable: (wrap ? PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE : PrimitiveNullableKind.NULLABLE),
      };

      return nullablePrimitive;
    }

    return type;
  }

  public static swapTypeForWholeModel<T extends OmniType, R extends OmniType>(
    model: IOmniModel,
    needle: T,
    replacement: R,
    maxDepth = 10,
  ): void {

    [...model.types].forEach(t => {

      const swapped = OmniUtil.swapType(t, needle, replacement, maxDepth);
      if (swapped) {
        // NOTE: Might crash when we remove from ourselves?
        const idx = model.types.indexOf(t);
        if (idx !== -1) {
          model.types.splice(idx, 1, swapped);
        }
      }
    });

    model.endpoints.forEach(e => {

      const swapped = OmniUtil.swapType(e.request.type, needle, replacement, maxDepth);
      if (swapped) {
        e.request.type = swapped;
      }

      e.responses.forEach(r => {
        const swapped = OmniUtil.swapType(r.type, needle, replacement, maxDepth);
        if (swapped) {
          r.type = swapped;
        }
      });
    });
    (model.continuations || []).forEach(c => {
      c.mappings.forEach(m => {
        (m.source.propertyPath || []).forEach(p => {
          const swappedOwner = OmniUtil.swapType(p.owner, needle, replacement, maxDepth);
          if (swappedOwner) {
            p.owner = swappedOwner as OmniPropertyOwner;
          }

          const swappedType = OmniUtil.swapType(p.type, needle, replacement, maxDepth);
          if (swappedType) {
            p.type = swappedType;
          }
        });
        (m.target.propertyPath || []).forEach(p => {
          const swappedOwner = OmniUtil.swapType(p.owner, needle, replacement, maxDepth);
          if (swappedOwner) {
            p.owner = swappedOwner as OmniPropertyOwner;
          }

          const swappedType = OmniUtil.swapType(p.type, needle, replacement, maxDepth);
          if (swappedType) {
            p.type = swappedType;
          }
        });
      });
    });
  }

  /**
   * Iterates through a type and all its related types, and replaces all found needles with the given replacement.
   *
   * If a type is returned from this method, then it is up to the caller to replace the type relative to the root's owner.
   *
   * TODO: Implement a general way of traversing all the types, so we do not need to duplicate this functionality everywhere!
   * TODO: This feels very inefficient right now... needs a very good revamp
   *
   * @param root
   * @param needle
   * @param replacement
   * @param maxDepth
   */
  public static swapType<T extends OmniType, R extends OmniType>(
    root: OmniType,
    needle: T,
    replacement: R,
    maxDepth = 10,
  ): R | undefined {

    if (root == needle) {
      return replacement;
    }

    if (maxDepth == 0) {
      return undefined;
    }

    if (root.kind == OmniTypeKind.COMPOSITION) {

      let types: OmniType[];
      switch (root.compositionKind) {
        case CompositionKind.AND:
          types = root.andTypes;
          break;
        case CompositionKind.OR:
          types = root.orTypes;
          break;
        case CompositionKind.XOR:
          types = root.xorTypes;
          break;
        case CompositionKind.NOT:
          types = root.notTypes;
          break;
      }

      for (let i = 0; i < types.length; i++) {
        const found = OmniUtil.swapType(types[i], needle, replacement, maxDepth - 1);
        if (found) {
          types.splice(i, 1, replacement);
        }
      }
    } else if (root.kind == OmniTypeKind.OBJECT) {
      if (root.extendedBy) {
        const found = OmniUtil.swapType(root.extendedBy, needle, replacement, maxDepth - 1);
        if (found) {
          const inheritableReplacement = OmniUtil.asInheritableType(replacement);
          if (!inheritableReplacement) {
            throw new Error(`Not allowed to use '${OmniUtil.getTypeDescription(replacement)}' as extendable type`);
          }

          root.extendedBy = inheritableReplacement;
        }
      }

      for (const property of root.properties) {
        const found = OmniUtil.swapType(property.type, needle, replacement, maxDepth - 1);
        if (found) {
          property.type = replacement;
        }
      }
    } else if (root.kind == OmniTypeKind.INTERFACE) {
      const inheritableReplacement = OmniUtil.asInheritableType(replacement);
      if (inheritableReplacement) {
        const found = OmniUtil.swapType(root.of, needle, inheritableReplacement, maxDepth - 1);
        if (found) {
          root.of = inheritableReplacement;
        }
      } else {
        throw new Error(`Cannot replace, since the interface requires a replacement that is inheritable`);
      }
    } else if (root.kind == OmniTypeKind.GENERIC_TARGET) {

      for (let i = 0; i < root.targetIdentifiers.length; i++) {
        const identifier = root.targetIdentifiers[i];
        const found = OmniUtil.swapType(identifier.type, needle, replacement, maxDepth - 1);
        if (found) {
          identifier.type = found;
        }
      }

      const found = OmniUtil.swapType(root.source, needle, replacement, maxDepth - 1);
      if (found) {
        if (found.kind == OmniTypeKind.GENERIC_SOURCE) {
          root.source = found;
        } else {
          throw new Error(`Cannot replace, since it must be a generic source`);
        }
      }

    } else if (root.kind == OmniTypeKind.GENERIC_SOURCE) {

      for (let i = 0; i < root.sourceIdentifiers.length; i++) {
        const identifier = root.sourceIdentifiers[i];
        if (identifier.lowerBound) {
          const found = OmniUtil.swapType(identifier.lowerBound, needle, replacement, maxDepth - 1);
          if (found) {
            identifier.lowerBound = found;
          }
        }
        if (identifier.upperBound) {
          const found = OmniUtil.swapType(identifier.upperBound, needle, replacement, maxDepth - 1);
          if (found) {
            identifier.upperBound = found;
          }
        }
      }

      const found = OmniUtil.swapType(root.of, needle, replacement, maxDepth - 1);
      if (found) {
        if (found.kind == OmniTypeKind.OBJECT) {
          root.of = found;
        } else {
          throw new Error(`Cannot replace, since the replacement has to be an object`);
        }
      }
    } else if (root.kind == OmniTypeKind.DICTIONARY) {

      const foundKey = OmniUtil.swapType(root.keyType, needle, replacement, maxDepth - 1);
      if (foundKey) {
        root.keyType = foundKey;
      }

      const foundValue = OmniUtil.swapType(root.valueType, needle, replacement, maxDepth - 1);
      if (foundValue) {
        root.valueType = foundValue;
      }
    } else if (root.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      for (let i = 0; i < root.types.length; i++) {
        const found = OmniUtil.swapType(root.types[i], needle, replacement, maxDepth - 1);
        if (found) {
          root.types.splice(i, 1, found);
        }
      }
    } else if (root.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const property of root.properties) {
        const found = OmniUtil.swapType(property.type, needle, replacement, maxDepth - 1);
        if (found) {
          property.type = found;
        }
      }
    } else if (root.kind == OmniTypeKind.ARRAY) {
      const found = OmniUtil.swapType(root.of, needle, replacement, maxDepth - 1);
      if (found) {
        root.of = found;
      }
    }

    return undefined;
  }

  public static getCommonDenominator(...types: OmniType[]): OmniType | undefined {

    let common: OmniType | undefined = types[0];
    for (let i = 1; i < types.length; i++) {
      common = OmniUtil.getCommonDenominatorBetween(common, types[i]);
      if (!common) {
        return undefined;
      }
    }

    return common;
  }

  /**
   * If the two types are in essence equal, 'a' is the one that is returned.
   * This can be used to check if 'a' and 'b' are the same (by value, not necessarily reference)
   *
   * @param a
   * @param b
   * @param create
   */
  public static getCommonDenominatorBetween(a: OmniType, b: OmniType, create?: boolean): OmniType | undefined {

    if (a == b) {
      return a;
    }

    if (a.kind == OmniTypeKind.PRIMITIVE && b.kind == OmniTypeKind.PRIMITIVE) {
      return this.getCommonDenominatorBetweenPrimitives(a, b);
    } else if (a.kind == OmniTypeKind.HARDCODED_REFERENCE && b.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return a.fqn === b.fqn ? a : undefined;
    } else if (a.kind == OmniTypeKind.ENUM && b.kind == OmniTypeKind.ENUM) {
      // TODO: This can probably be VERY much improved -- like taking the entries that are similar between the two
      return Naming.safe(a.name) == Naming.safe(b.name) ? a : undefined;
    } else if (a.kind == OmniTypeKind.DICTIONARY && b.kind == OmniTypeKind.DICTIONARY) {
      return this.getCommonDenominatorBetweenDictionaries(a, b, create);
    } else if (a.kind == OmniTypeKind.ARRAY && b.kind == OmniTypeKind.ARRAY) {
      return this.getCommonDenominatorBetweenArrays(a, b, create);
    } else if (a.kind == OmniTypeKind.UNKNOWN && b.kind == OmniTypeKind.UNKNOWN) {
      return a;
    } else if (a.kind == OmniTypeKind.NULL && b.kind == OmniTypeKind.NULL) {
      return a;
    } else if (a.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION && b.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      return this.getCommonDenominatorBetweenPropertiesByPosition(a, b, create);
    } else if (a.kind == OmniTypeKind.OBJECT || b.kind == OmniTypeKind.OBJECT) {
      return this.getCommonDenominatorBetweenObjectAndOther(a, b, create);
    } else if (a.kind == OmniTypeKind.COMPOSITION) {
      // TODO: Do something here. There might be parts of 'a' and 'b' that are similar.
      // TODO: Should we then create a new composition type, or just return the first match?
    } else if (a.kind == OmniTypeKind.GENERIC_TARGET) {
      if (b.kind == OmniTypeKind.GENERIC_TARGET) {
        return this.getCommonDenominatorBetweenGenericTargets(a, b, create);
      }
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenGenericTargets(
    a: IOmniGenericTargetType,
    b: IOmniGenericTargetType,
    create?: boolean,
  ): IOmniGenericTargetType | undefined {

    if (a.source != b.source) {
      return undefined;
    }

    // TODO: Improve! Right now we might need to move the generic target types into external types.
    //        <T extends generated.omnigen.JsonRpcRequestParams<generated.omnigen.AccountLedgerRequestParamsData>>
    //        <T extends generated.omnigen.JsonRpcRequestParams<generated.omnigen.AccountPayoutParamsData>>
    //        =
    //        <TData extends generated.omnigen.AbstractToTrustlyRequestParamsData, T extends generated.omnigen.JsonRpcRequestParams<TData>>
    //        Then "params" should be of type T
    //        So if they differ, we need to explode the types
    //        Hopefully this will automatically be done recursively per level of inheritance so it's less complex to code!

    const commonTargetIdentifiers: IOmniGenericTargetIdentifierType[] = [];

    const matching = OmniUtil.getMatchingTargetIdentifiers(a.targetIdentifiers, b.targetIdentifiers);
    if (!matching) {
      return undefined;
    }

    for (const match of matching) {

      const commonIdentifierType = OmniUtil.getCommonDenominatorBetween(match.a.type, match.b.type, create);
      if (!commonIdentifierType || create == false) {
        return undefined;
      }

      commonTargetIdentifiers.push({
        kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
        type: commonIdentifierType,
        sourceIdentifier: match.a.sourceIdentifier,
      });
    }

    const commonGenericTarget: IOmniGenericTargetType = {
      ...a,
      targetIdentifiers: commonTargetIdentifiers,
    };

    return commonGenericTarget;
  }

  private static getMatchingTargetIdentifiers(
    a: IOmniGenericTargetIdentifierType[],
    b: IOmniGenericTargetIdentifierType[],
  ): Array<TargetIdentifierTuple> | undefined {

    if (a.length != b.length) {
      return undefined;
    }

    const result: Array<TargetIdentifierTuple> = [];
    for (const aIdentifier of a) {
      let bFound: IOmniGenericTargetIdentifierType | undefined = undefined;
      for (const bIdentifier of b) {
        if (aIdentifier.sourceIdentifier == bIdentifier.sourceIdentifier) {
          bFound = bIdentifier;
        }
      }

      if (bFound) {
        result.push({
          a: aIdentifier,
          b: bFound,
        });
      } else {
        return undefined;
      }
    }

    return result;
  }

  private static getCommonDenominatorBetweenObjectAndOther(
    a: OmniType,
    b: OmniType,
    create?: boolean,
  ): OmniType | undefined {
    if (b.kind == OmniTypeKind.OBJECT && b.extendedBy) {

      // This will recursively search downwards in B's hierarchy.
      const common = OmniUtil.getCommonDenominatorBetween(a, b.extendedBy, create);
      if (common) {
        return common;
      }
    }

    if (a.kind == OmniTypeKind.OBJECT && a.extendedBy) {
      const common = OmniUtil.getCommonDenominatorBetween(a.extendedBy, b, create);
      if (common) {
        return common;
      }
    }

    if (create == false) {
      return undefined;
    }

    // Is there ever anything better we can do here? Like check if signatures are matching?
    return {
      kind: OmniTypeKind.UNKNOWN,
    };
  }

  private static getCommonDenominatorBetweenPropertiesByPosition(
    a: IOmniArrayPropertiesByPositionType,
    b: IOmniArrayPropertiesByPositionType,
    create?: boolean,
  ): IOmniArrayPropertiesByPositionType | undefined {

    if (a.properties.length === b.properties.length) {
      for (let i = 0; i < a.properties.length; i++) {
        if (a.properties[i].name !== b.properties[i].name) {
          return undefined;
        }

        const commonType = OmniUtil.getCommonDenominatorBetween(a.properties[i].type, b.properties[i].type, create);
        if (!commonType) {
          return undefined;
        }
      }

      // TODO: Return something else here instead, which is actually the common denominators between the two
      return a;
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenArrays(
    a: IOmniArrayType,
    b: IOmniArrayType,
    create?: boolean,
  ): IOmniArrayType | undefined {

    const common = OmniUtil.getCommonDenominatorBetween(a.of, b.of, create);
    if (common == a.of) {
      return a;
    }

    if (create == false) {
      return undefined;
    }

    return <IOmniArrayType>{
      ...b,
      ...a,
      of: common,
    };
  }

  private static getCommonDenominatorBetweenPrimitives(
    a: IOmniPrimitiveType,
    b: IOmniPrimitiveType,
  ): IOmniPrimitiveType | undefined {

    // NOTE: Must nullable be equal? Or do we return the nullable type (if exists) as the common denominator?
    if (a.nullable == b.nullable) {
      if (a.primitiveKind == b.primitiveKind) {
        return a;
      }

      switch (a.primitiveKind) {
        case OmniPrimitiveKind.INTEGER:
        case OmniPrimitiveKind.INTEGER_SMALL:
          switch (b.primitiveKind) {
            case OmniPrimitiveKind.LONG:
            case OmniPrimitiveKind.DOUBLE:
            case OmniPrimitiveKind.FLOAT:
            case OmniPrimitiveKind.DECIMAL:
              return b;
          }
          break;
        case OmniPrimitiveKind.LONG:
          switch (b.primitiveKind) {
            case OmniPrimitiveKind.DOUBLE:
            case OmniPrimitiveKind.FLOAT:
            case OmniPrimitiveKind.DECIMAL:
              return b;
          }
          break;
        case OmniPrimitiveKind.FLOAT:
          switch (b.primitiveKind) {
            case OmniPrimitiveKind.DOUBLE:
            case OmniPrimitiveKind.DECIMAL:
              return b;
          }
          break;
        case OmniPrimitiveKind.DECIMAL:
          switch (b.primitiveKind) {
            case OmniPrimitiveKind.DOUBLE:
              return b;
          }
          break;
        case OmniPrimitiveKind.NUMBER:
          switch (b.primitiveKind) {
            case OmniPrimitiveKind.INTEGER:
            case OmniPrimitiveKind.INTEGER_SMALL:
            case OmniPrimitiveKind.LONG:
            case OmniPrimitiveKind.DOUBLE:
            case OmniPrimitiveKind.FLOAT:
            case OmniPrimitiveKind.DECIMAL:
              return b;
          }
          break;
        case OmniPrimitiveKind.CHAR:
          switch (b.primitiveKind) {
            case OmniPrimitiveKind.STRING:
              return b;
          }
          break;
      }
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenDictionaries(
    a: IOmniDictionaryType,
    b: IOmniDictionaryType,
    create?: boolean,
  ): IOmniDictionaryType | undefined {

    const commonKey = OmniUtil.getCommonDenominatorBetween(a.keyType, b.keyType, create);
    if (commonKey) {
      const commonValue = OmniUtil.getCommonDenominatorBetween(a.valueType, b.valueType, create);
      if (commonValue) {
        if (commonKey == a.keyType && commonValue == a.valueType) {
          return a;
        }

        if (create == false) {
          return undefined;
        }

        const newDictionary: IOmniDictionaryType = {
          kind: OmniTypeKind.DICTIONARY,
          keyType: commonKey,
          valueType: commonValue,
        };

        return {...b, ...a, ...newDictionary};
      }
    }

    return undefined;
  }

}
