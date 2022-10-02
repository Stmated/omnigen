import {
  CompositionKind,
  OmniInheritableType,
  OmniModel,
  OmniPrimitiveConstantValue,
  OmniPrimitiveConstantValueOrLazySubTypeValue,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
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
    OmniUtil.traverseTypesInternal(type, 0, true, (localType) => {

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

  public static getUnwrappedTopType(type: OmniType): OmniType {

    if (type.kind == OmniTypeKind.ARRAY) {
      return type.of;
    }

    return type;
  }

  public static traverseTypes(type: TraverseInput, callback: TraverseCallback): void {
    OmniUtil.traverseTypesInternal(type, 0, false, callback);
  }

  private static traverseTypesInternal(
    type: TraverseInput,
    depth: number,
    checkEarly: boolean,
    callback: TraverseCallback
  ): TraverseCallbackResult {

    if (!type) return;

    if (Array.isArray(type)) {
      for (const entry of type) {
        const entryResult = OmniUtil.traverseTypesInternal(entry, depth, checkEarly, callback);
        if (entryResult == 'abort') {
          return 'abort';
        }
      }
      return;
    }

    if (checkEarly) {
      switch (callback(type, depth)) {
        case 'abort':
          return 'abort';
        case 'skip':
          // 'skip' will not be propagated, but will simply not go deeper.
          return 'skip';
      }
    }

    if (type.kind == OmniTypeKind.OBJECT) {
      if (this.traverseTypesInternal(type.extendedBy, depth + 1, checkEarly, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.nestedTypes, depth + 1, checkEarly, callback) == 'abort') return 'abort';
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, checkEarly, callback) == 'abort') return 'abort';
      }
    } else if (type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      if (this.traverseTypesInternal(type.types, depth, checkEarly, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.commonDenominator, depth, checkEarly, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, checkEarly, callback) == 'abort') return 'abort';
      }
      if (this.traverseTypesInternal(type.commonDenominator, depth, checkEarly, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.COMPOSITION) {
      if (type.compositionKind == CompositionKind.AND) {
        if (this.traverseTypesInternal(type.andTypes, depth + 1, checkEarly, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.OR) {
        if (this.traverseTypesInternal(type.orTypes, depth + 1, checkEarly, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.XOR) {
        if (this.traverseTypesInternal(type.xorTypes, depth + 1, checkEarly, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.NOT) {
        if (this.traverseTypesInternal(type.notTypes, depth + 1, checkEarly, callback) == 'abort') return 'abort';
      }
    } else if (type.kind == OmniTypeKind.ARRAY) {
      if (this.traverseTypesInternal(type.of, depth, checkEarly, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.DICTIONARY) {
      if (this.traverseTypesInternal(type.keyType, depth, checkEarly, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.valueType, depth, checkEarly, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      // if (this.traverseTypesInternal(type.of, depth, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.sourceIdentifiers, depth, checkEarly, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      if (this.traverseTypesInternal(type.targetIdentifiers, depth, checkEarly, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      if (this.traverseTypesInternal(type.type, depth, checkEarly, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
      if (this.traverseTypesInternal(type.lowerBound, depth, checkEarly, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.upperBound, depth, checkEarly, callback) == 'abort') return 'abort';
    }

    if (!checkEarly) {
      switch (callback(type, depth)) {
        case 'abort':
          return 'abort';
        case 'skip':
          // 'skip' will not be propagated, but will simply not go deeper.
          return 'skip';
      }
    }
  }

  private static getTypesRecursively(type: TraverseInput, target: Set<OmniType>, edge: Set<OmniType>, depth: number): void {
    OmniUtil.traverseTypesInternal(type, depth, false, (localType, depth) => {
      target.add(localType);
      if (depth == 0) {
        edge.add(localType);
      }
    });
  }

  public static asInheritableType(type: OmniType): OmniInheritableType | undefined {
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
        const entryResult = OmniUtil.traverseTypesInternal(entry, depth, false, callback);
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
      if (this.traverseTypesInternal(type.extendedBy, depth + 1, false, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      if (this.traverseTypesInternal(type.types, depth, false, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, false, callback) == 'abort') return 'abort';
      }
      if (this.traverseTypesInternal(type.commonDenominator, depth, false, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.COMPOSITION) {
      if (type.compositionKind == CompositionKind.AND) {
        if (this.traverseTypesInternal(type.andTypes, depth + 1, false, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.OR) {
        if (this.traverseTypesInternal(type.orTypes, depth + 1, false, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.XOR) {
        if (this.traverseTypesInternal(type.xorTypes, depth + 1, false, callback) == 'abort') return 'abort';
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
}
