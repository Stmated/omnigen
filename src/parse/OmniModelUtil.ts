import {
  CompositionKind,
  OmniInheritableType,
  OmniModel,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  TypeName
} from '@parse/OmniModel';
import {LiteralType} from 'ts-json-schema-generator';
import {LiteralValue} from 'ts-json-schema-generator/src/Type/LiteralType';

export interface TypeCollection {

  named: OmniType[];
  all: OmniType[];
  edge: OmniType[];
}

export type TraverseInput = OmniType | OmniType[] | undefined;
export type TraverseCallbackResult = 'abort' | 'skip' | void;
export type TraverseCallback = {(type: OmniType, depth: number): TraverseCallbackResult};

export class OmniModelUtil {

  public static getAllExportableTypes(model: OmniModel, refTypes?: OmniType[]): TypeCollection {

    // TODO: Should be an option to do a deep dive or a quick dive!
    const set = new Set<OmniType>();
    const setEdge = new Set<OmniType>();
    if (refTypes) {
      for (const refType of refTypes) {
        OmniModelUtil.getTypesRecursively(refType, set, setEdge, 0);
      }
    }

    model.endpoints.forEach(e => {
      OmniModelUtil.getTypesRecursively(e.request.type, set, setEdge, 0);

      e.responses.forEach(r => {
        OmniModelUtil.getTypesRecursively(r.type, set, setEdge, 0);
      });
    });
    (model.continuations || []).forEach(c => {
      c.mappings.forEach(m => {
        (m.source.propertyPath || []).forEach(p => {
          OmniModelUtil.getTypesRecursively(p.owner, set, setEdge, 1);
          OmniModelUtil.getTypesRecursively(p.type, set, setEdge, 1);
        });
        (m.target.propertyPath || []).forEach(p => {
          OmniModelUtil.getTypesRecursively(p.owner, set, setEdge, 1);
          OmniModelUtil.getTypesRecursively(p.type, set, setEdge, 1);
        });
      })
    });

    return {
      all: [...set],
      edge: [...setEdge],
      named: [],
    };
  }

  public static traverseTypes(type: TraverseInput, callback: TraverseCallback): void {
    OmniModelUtil.traverseTypesInternal(type, 0, callback);
  }

  private static traverseTypesInternal(type: TraverseInput, depth: number, callback: TraverseCallback): TraverseCallbackResult {

    if (!type) return;
    if (Array.isArray(type)) {
      for (const entry of type) {
        const entryResult = OmniModelUtil.traverseTypesInternal(entry, depth, callback);
        if (entryResult == 'abort'){
          return 'abort';
        }
      }
      return;
    }



    if (type.kind == OmniTypeKind.OBJECT) {
      if (this.traverseTypesInternal(type.extendedBy, depth + 1, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.nestedTypes, depth + 1, callback) == 'abort') return 'abort';
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, callback) == 'abort') return 'abort';
      }
    } else if (type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      if (this.traverseTypesInternal(type.types, depth, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.commonDenominator, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, callback) == 'abort') return 'abort';
      }
      if (this.traverseTypesInternal(type.commonDenominator, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.COMPOSITION) {
      if (type.compositionKind == CompositionKind.AND) {
        if (this.traverseTypesInternal(type.andTypes, depth + 1, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.OR) {
        if (this.traverseTypesInternal(type.orTypes, depth + 1, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.XOR) {
        if (this.traverseTypesInternal(type.xorTypes, depth + 1, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.NOT) {
        if (this.traverseTypesInternal(type.notTypes, depth + 1, callback) == 'abort') return 'abort';
      }
    } else if (type.kind == OmniTypeKind.ARRAY) {
      if (this.traverseTypesInternal(type.of, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.DICTIONARY) {
      if (this.traverseTypesInternal(type.keyType, depth, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.valueType, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      //if (this.traverseTypesInternal(type.of, depth, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.sourceIdentifiers, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      if (this.traverseTypesInternal(type.targetIdentifiers, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      if (this.traverseTypesInternal(type.type, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
      if (this.traverseTypesInternal(type.lowerBound, depth, callback) == 'abort') return 'abort';
      if (this.traverseTypesInternal(type.upperBound, depth, callback) == 'abort') return 'abort';
    }

    // Callback self, and then try to find recursive types.
    switch (callback(type, depth)) {
      case 'abort':
        return 'abort';
      case 'skip':
        // 'skip' will not be propagated, but will simply not go deeper.
        return 'skip';
    }
  }

  private static getTypesRecursively(type: TraverseInput, target: Set<OmniType>, edge: Set<OmniType>, depth: number): void {
    OmniModelUtil.traverseTypesInternal(type, depth, (localType, depth) => {
      target.add(localType);
      if (depth == 0) {
        edge.add(localType);
      }
    });
  }

  public static asInheritableType(type: OmniType): OmniInheritableType | undefined {
    if (type.kind == OmniTypeKind.OBJECT
      || type.kind == OmniTypeKind.GENERIC_TARGET
      || type.kind == OmniTypeKind.COMPOSITION) {
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
        const entryResult = OmniModelUtil.traverseTypesInternal(entry, depth, callback);
        if (entryResult == 'abort'){
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
      if (this.traverseTypesInternal(type.extendedBy, depth + 1, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      if (this.traverseTypesInternal(type.types, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const p of type.properties) {
        if (this.traverseTypesInternal(p.type, depth, callback) == 'abort') return 'abort';
      }
      if (this.traverseTypesInternal(type.commonDenominator, depth, callback) == 'abort') return 'abort';
    } else if (type.kind == OmniTypeKind.COMPOSITION) {
      if (type.compositionKind == CompositionKind.AND) {
        if (this.traverseTypesInternal(type.andTypes, depth + 1, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.OR) {
        if (this.traverseTypesInternal(type.orTypes, depth + 1, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.XOR) {
        if (this.traverseTypesInternal(type.xorTypes, depth + 1, callback) == 'abort') return 'abort';
      } else if (type.compositionKind == CompositionKind.NOT) {
        // TODO: How to tell consumer that this is a NEGATION?!
        // if (this.traverseTypesInternal(type.notTypes, depth + 1, callback) == 'abort') return 'abort';
      }
    }
  }

  public static getClosestProperty(type: OmniType, propertyName: string): OmniProperty | undefined {

    const reference: {property?: OmniProperty} = {};
    OmniModelUtil.traverseHierarchy(type, 0, (localType) => {
      const property = OmniModelUtil.getPropertiesOf(localType).find(it => it.name == propertyName);
      if (property) {
        reference.property = property;
        return 'abort';
      }

      return undefined;
    });

    return reference.property;
  }

  public static getName(type: OmniType): TypeName {

    if (type.kind == OmniTypeKind.OBJECT) {
      return type.name;
    }

    return '';
  }

  public static getTypesThatInheritFrom(model: OmniModel, type: OmniType): OmniType[] {

    const types: OmniType[] = [];

    // TODO: Make a visitor version of getAllExportableTypes? Less useless memory consumption.
    const exportableTypes = OmniModelUtil.getAllExportableTypes(model);

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
}
