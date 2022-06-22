import {GenericModel, GenericType, GenericTypeKind} from '@parse/GenericModel';

export class GenericModelUtil {

  public static getAllExportableTypes(model: GenericModel, refTypes?: GenericType[]): GenericType[] {

    // TODO: Should be an option to do a deep dive or a quick dive!
    const set = new Set<GenericType>();
    if (refTypes) {
      for (const refType of refTypes) {
        set.add(refType);
      }
    }

    model.endpoints.forEach(e => GenericModelUtil.getTypesRecursively(e.request.type, set));
    model.endpoints.forEach(e => e.responses.forEach(r => GenericModelUtil.getTypesRecursively(r.type, set)));
    (model.continuations || []).forEach(c => {
      c.mappings.forEach(m => {
        (m.source.propertyPath || []).forEach(p => {
          GenericModelUtil.getTypesRecursively(p.owner, set);
          GenericModelUtil.getTypesRecursively(p.type, set);
        });
        (m.target.propertyPath || []).forEach(p => {
          GenericModelUtil.getTypesRecursively(p.owner, set);
          GenericModelUtil.getTypesRecursively(p.type, set);
        });
      })
    });

    return [...set].filter(it => {

      // Is this enough?
      return it.kind == GenericTypeKind.OBJECT || it.kind == GenericTypeKind.ENUM || it.kind == GenericTypeKind.COMPOSITION;
    });
  }

  public static getTypesRecursively(type: GenericType, target: Set<GenericType>): void {

    // Add self, and then try to find recursive types.
    target.add(type);

    if (type.kind == GenericTypeKind.OBJECT) {
      if (type.extendedBy) {
        this.getTypesRecursively(type.extendedBy, target);
      }
      if (type.nestedTypes) {
        type.nestedTypes.forEach(it => this.getTypesRecursively(it, target));
      }
      if (type.properties) {
        type.properties.forEach(it => this.getTypesRecursively(it.type, target));
      }

    } else if (type.kind == GenericTypeKind.ARRAY_TYPES_BY_POSITION) {
      type.types.forEach(it => this.getTypesRecursively(it, target));
      if (type.commonDenominator) {
        this.getTypesRecursively(type.commonDenominator, target);
      }
    } else if (type.kind == GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      type.properties.forEach(it => this.getTypesRecursively(it.type, target));
      if (type.commonDenominator) {
        this.getTypesRecursively(type.commonDenominator, target);
      }
    } else if (type.kind == GenericTypeKind.COMPOSITION) {
      type.types.forEach(it => this.getTypesRecursively(it, target));
    } else if (type.kind == GenericTypeKind.ARRAY) {
      this.getTypesRecursively(type.of, target);
    } else if (type.kind == GenericTypeKind.DICTIONARY) {
      this.getTypesRecursively(type.keyType, target);
      this.getTypesRecursively(type.valueType, target);
    }
  }
}
