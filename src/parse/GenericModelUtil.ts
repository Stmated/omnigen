import {OmniModel, OmniType, OmniTypeKind} from '@parse/OmniModel';

export interface TypeCollection {

  // edge: GenericType[];
  named: OmniType[];
  all: OmniType[];
}

export class GenericModelUtil {

  public static getAllExportableTypes(model: OmniModel, refTypes?: OmniType[]): TypeCollection {

    // TODO: Should be an option to do a deep dive or a quick dive!
    const set = new Set<OmniType>();
    const setEdge = new Set<OmniType>();
    if (refTypes) {
      for (const refType of refTypes) {
        set.add(refType);
      }
    }

    model.endpoints.forEach(e => {
      GenericModelUtil.getTypesRecursively(e.request.type, set, setEdge, true);

      e.responses.forEach(r => {
        GenericModelUtil.getTypesRecursively(r.type, set, setEdge, true);
      });
    });
    (model.continuations || []).forEach(c => {
      c.mappings.forEach(m => {
        (m.source.propertyPath || []).forEach(p => {
          GenericModelUtil.getTypesRecursively(p.owner, set, setEdge, false);
          GenericModelUtil.getTypesRecursively(p.type, set, setEdge, false);
        });
        (m.target.propertyPath || []).forEach(p => {
          GenericModelUtil.getTypesRecursively(p.owner, set, setEdge, false);
          GenericModelUtil.getTypesRecursively(p.type, set, setEdge, false);
        });
      })
    });

    return {
      all: [...set],
      // edge: [...setEdge].filter(it => GenericModelUtil.isNotPrimitive(it)),
      named: [],
    };
  }

  public static isNotPrimitive(it: OmniType): boolean {

      // Is this enough?
      return it.kind == OmniTypeKind.OBJECT
        || it.kind == OmniTypeKind.ENUM
        || it.kind == OmniTypeKind.COMPOSITION;
  }

  private static getTypesRecursively(type: OmniType, target: Set<OmniType>, edge: Set<OmniType>, isEdge: boolean): void {

    // Add self, and then try to find recursive types.
    target.add(type);
    if (isEdge) {
      edge.add(type);
    }

    if (type.kind == OmniTypeKind.OBJECT) {
      if (type.extendedBy) {
        this.getTypesRecursively(type.extendedBy, target, edge, false);
      }
      if (type.nestedTypes) {
        type.nestedTypes.forEach(nested => this.getTypesRecursively(nested, target, edge, false));
      }
      if (type.properties) {
        type.properties.forEach(p => this.getTypesRecursively(p.type, target, edge, isEdge));
      }

    } else if (type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      type.types.forEach(t =>  this.getTypesRecursively(t, target, edge, isEdge));
      if (type.commonDenominator) {
        this.getTypesRecursively(type.commonDenominator, target, edge, isEdge);
      }
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      type.properties.forEach(p =>  this.getTypesRecursively(p.type, target, edge, isEdge));
      if (type.commonDenominator) {
        this.getTypesRecursively(type.commonDenominator, target, edge, isEdge);
      }
    } else if (type.kind == OmniTypeKind.COMPOSITION) {
      type.types.forEach(it => this.getTypesRecursively(it, target, edge, isEdge));
    } else if (type.kind == OmniTypeKind.ARRAY) {
      this.getTypesRecursively(type.of, target, edge, isEdge);
    } else if (type.kind == OmniTypeKind.DICTIONARY) {
      this.getTypesRecursively(type.keyType, target, edge, isEdge);
      this.getTypesRecursively(type.valueType, target, edge, isEdge);
    }
  }
}
