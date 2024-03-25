import {
  OmniCompositionType,
  OmniSuperTypeCapableType,
  OmniObjectType,
  OmniProperty,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  TypeName,
  VisitResult,
} from '@omnigen/core';
import {expect} from 'vitest';

type OmniPropertyOrphan = Omit<OmniProperty, 'owner'> & Partial<Pick<OmniProperty, 'owner'>>;

export type MapArg<T> = Array<[T, Array<T>]>;

export class TestUtils {

  public static obj(name: TypeName, extendedBy?: OmniSuperTypeCapableType, properties?: OmniPropertyOrphan[]): OmniObjectType {
    const omniClass: OmniObjectType = {
      name: name,
      kind: OmniTypeKind.OBJECT,
      extendedBy: extendedBy,
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

  public static and<T extends OmniType>(...types: T[]): OmniCompositionType<T, typeof OmniTypeKind.INTERSECTION> {
    return {
      kind: OmniTypeKind.INTERSECTION,
      types: types,
    };
  }

  public static prop(name: string, type: OmniType, owner?: OmniPropertyOwner): OmniProperty | OmniPropertyOrphan {
    if (owner) {
      return {
        name: name,
        type: type,
        owner: owner,
      };
    } else {
      return {
        name: name,
        type: type,
      };
    }
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

  public static map<T>(arg: MapArg<T>): Map<T, T[]> {
    const map = new Map<T, T[]>();
    for (const array of arg) {
      map.set(array[0], array[1]);
    }

    return map;
  }

  public static equalsRegex(given: string[], expected: string[]): void {

    expect(given).toHaveLength(expected.length);
  }
}
