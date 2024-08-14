import {OmniCompositionType, OmniItemKind, OmniObjectType, OmniProperty, OmniSuperTypeCapableType, OmniType, OmniTypeKind, TypeName} from '@omnigen/api';

export type MapArg<T> = Array<[T, Array<T>]>;

export class TestUtils {

  public static obj(name: TypeName, extendedBy?: OmniSuperTypeCapableType, properties?: OmniProperty[]): OmniObjectType {

    return {
      name: name,
      kind: OmniTypeKind.OBJECT,
      extendedBy: extendedBy,
      properties: properties ?? [],
    };
  }

  public static and<T extends OmniType>(...types: T[]): OmniCompositionType<T, typeof OmniTypeKind.INTERSECTION> {
    return {
      kind: OmniTypeKind.INTERSECTION,
      types: types,
    };
  }

  public static prop(name: string, type: OmniType): OmniProperty {
    return {
      kind: OmniItemKind.PROPERTY,
      name: name,
      type: type,
    };
  }

  public static map<T>(arg: MapArg<T>): Map<T, T[]> {
    const map = new Map<T, T[]>();
    for (const array of arg) {
      map.set(array[0], array[1]);
    }

    return map;
  }
}
