import {
  CompositionKind,
  OmniCompositionType,
  OmniInheritableType,
  IOmniObjectType,
  IOmniProperty,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  TypeName,
  VisitResult,
} from '@omnigen/core';

type OmniPropertyOrphan = Omit<IOmniProperty, 'owner'> & Partial<Pick<IOmniProperty, 'owner'>>;

export class TestUtils {

  public static obj(name: TypeName, extendedBy?: OmniInheritableType, properties?: OmniPropertyOrphan[]): IOmniObjectType {
    const omniClass: IOmniObjectType = {
      name: name,
      kind: OmniTypeKind.OBJECT,
      extendedBy: extendedBy,
      additionalProperties: false,
      properties: [],
    };

    if (properties) {
      omniClass.properties = properties.map(it => {
        return {
          ...it,
          owner: omniClass,
        };
      });
    }

    return omniClass;
  }

  public static and(...types: OmniType[]): OmniCompositionType {
    return {
      kind: OmniTypeKind.COMPOSITION,
      compositionKind: CompositionKind.AND,
      andTypes: types,
    };
  }

  public static prop(name: string, type: OmniType, owner?: OmniPropertyOwner): IOmniProperty | OmniPropertyOrphan {
    return {
      name: name,
      type: type,
      owner: owner,
    };
  }

  public static flatten<T>(result: VisitResult<T>): T | undefined {

    if (!result) {
      return undefined;
    }

    if (Array.isArray(result)) {
      for (const item of result) {
        if (item) {
          const result = TestUtils.flatten(item);
          if (result) {
            return result;
          }
        }
      }

      return undefined;
    }

    return result;
  }
}
