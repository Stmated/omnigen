import {
  CompositionKind, OmniExternalModelReferenceType,
  OmniInheritableType,
  OmniModel,
  OmniPrimitiveConstantValue,
  OmniPrimitiveConstantValueOrLazySubTypeValue,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  PrimitiveNullableKind,
  TypeName
} from '@parse/OmniModel';
import {LiteralValue} from 'ts-json-schema-generator/src/Type/LiteralType';
import {Naming} from '@parse/Naming';

export interface TypeCollection {

  named: OmniType[];
  all: OmniType[];
  edge: OmniType[];
}

export type TraverseInput = OmniType | OmniType[] | undefined;
export type TraverseCallbackResult = 'abort' | 'skip' | void;
export type TraverseCallback = {(type: OmniType, depth: number): TraverseCallbackResult};

export class OmniUtil {

  public static getAllExportableTypes(model: OmniModel, refTypes?: OmniType[]): TypeCollection {

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
      })
    });

    return {
      all: [...set],
      edge: [...setEdge],
      named: [],
    };
  }

  public static isAssignableTo(type: TraverseInput, needle: OmniType): boolean {

    const result: {value: boolean} = {value: false};
    OmniUtil.traverseTypesInternal(type, 0, (localType) => {

      if (localType.kind == OmniTypeKind.GENERIC_TARGET) {
        return 'skip';
      }

      if (localType == needle) {
        result.value = true;
        return 'abort';
      }

      return undefined;
    }, undefined);

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
   */
  public static getUnwrappedType(
    type: OmniType
  ): Exclude<OmniType, OmniExternalModelReferenceType<OmniType>> {

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
    onUp?: TraverseCallback
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
   */
  public static getPropertiesOf(type: OmniType): OmniProperty[] {

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

  public static getClosestProperty(type: OmniType, propertyName: string): OmniProperty | undefined {

    const reference: { property?: OmniProperty } = {};
    OmniUtil.traverseHierarchy(type, 0, (localType) => {
      const property = OmniUtil.getPropertiesOf(localType).find(it => it.name == propertyName);
      if (property) {
        reference.property = property;
        return 'abort';
      }

      return undefined;
    });

    return reference.property;
  }

  public static getTypesThatInheritFrom(model: OmniModel, type: OmniType): OmniType[] {

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
        return  nullable ? 'String' : 'string';
      case OmniPrimitiveKind.FLOAT:
        return nullable ? 'Float' : 'float';
      case OmniPrimitiveKind.INTEGER:
        return nullable? 'Integer' : 'int';
      case OmniPrimitiveKind.INTEGER_SMALL:
        return nullable ? 'Short' : 'short';
      case OmniPrimitiveKind.LONG:
        return nullable ? 'Long' : 'long';
      case OmniPrimitiveKind.DECIMAL:
        return nullable ? "Decimal": "decimal";
      case OmniPrimitiveKind.DOUBLE:
        return nullable ? "Double": "double";
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
    subType: OmniType
  ): OmniPrimitiveConstantValue {

    if (typeof value == 'function') {
      return value(subType); // TODO: Check if this is correct
    } else {
      return value;
    }
  }

  /**
   * Gets the name of the type, or returns 'undefined' if the type is not named.
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
    }

    return undefined;
  }

  public static getVirtualTypeName(type: OmniType): TypeName {

    const typeName = OmniUtil.getTypeName(type);
    if (typeName) {
      return typeName;
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return (fn) => `ArrayOf${Naming.safe(OmniUtil.getVirtualTypeName(type.of), fn)}`;
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
      return "_unknown";
    }else if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return (fn) => `${Naming.safe(OmniUtil.getVirtualTypeName(type.of), fn)}From${type.model.name}`;
    }

    // TODO: All types should be able to return a "virtual" type name, which can be used for compositions or whatever!
    return `[ERROR: ADD VIRTUAL TYPE NAME FOR ${String(type.kind)}]`;
  }

  public static toGenericAllowedType(type: OmniType, wrap: boolean): OmniType {
    // Same thing for now, might change in the future.
    return OmniUtil.toNullableType(type, wrap);
  }

  public static toNullableType<T extends OmniType>(type: T, wrap: boolean): T | OmniPrimitiveType {
    // NOTE: If changed, make sure isNullable is updated
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.nullable || type.primitiveKind == OmniPrimitiveKind.STRING) {
        return type;
      }

      const nullablePrimitive: OmniPrimitiveType = {
        ...type,
        ...{
          nullable: (wrap ? PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE : PrimitiveNullableKind.NULLABLE)
        }
      };

      return nullablePrimitive;
    }

    return type;
  }

  public static swapTypeForWholeModel<T extends OmniType, R extends OmniType>(
    model: OmniModel,
    needle: T,
    replacement: R,
    maxDepth = 10
  ): void {

    [...model.types].forEach((t) => {

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
      })
    });
  }

  /**
   * Iterates through a type and all its related types, and replaces all found needles with the given replacement.
   *
   * If a type is returned from this method, then it is up to the caller to replace the type relative to the root's owner.
   *
   * TODO: Implement a general way of traversing all the types, so we do not need to duplicate this functionality everywhere!
   * TODO: This feels very inefficient right now... needs a very good revamp
   */
  public static swapType<T extends OmniType, R extends OmniType>(
    root: OmniType,
    needle: T,
    replacement: R,
    maxDepth = 10
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
}
