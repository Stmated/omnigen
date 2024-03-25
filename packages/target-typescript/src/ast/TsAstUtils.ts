import {CompositionKind, OmniArrayType, OmniDictionaryType, OmniGenericTargetType, OmniType, OmniTypeKind} from '@omnigen/core';
import {Ts} from '../ast';
import {Java} from '@omnigen/target-java';

export class TsAstUtils {

  public static createTypeNode<T extends OmniType>(type: T, implementation?: boolean): Java.TypeNode {

    if (type.kind == OmniTypeKind.DICTIONARY) {
      return this.createMapTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return this.createArrayTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.upperBound) {
        return new Java.BoundedType(type, new Java.WildcardType(type, implementation), TsAstUtils.createTypeNode(type.upperBound, implementation));
      } else {
        return new Java.WildcardType(type, implementation);
      }
    } else if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind != CompositionKind.NEGATION) {
      if (type.inline) {
        return new Ts.CompositionType(type, type.types.map(it => TsAstUtils.createTypeNode(it, implementation)));
      }
    } else if (type.kind == OmniTypeKind.DECORATING) {
      const of = TsAstUtils.createTypeNode(type.of, implementation);
      return new Java.DecoratingTypeNode(of, type);
    }

    return new Java.EdgeType<T>(type, implementation);
  }

  private static createGenericTargetTypeNode<T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const baseType = new Java.EdgeType(type, implementation);
    const mappedGenericTargetArguments = type.targetIdentifiers.map(it => TsAstUtils.createTypeNode(it.type, implementation));
    return new Java.GenericType(type, baseType, mappedGenericTargetArguments);
  }

  private static createArrayTypeNode<const T extends OmniArrayType>(
    type: T,
    implementation: boolean | undefined,
  ): Java.TypeNode<T> {

    const itemNode = TsAstUtils.createTypeNode(type.of);
    return new Java.ArrayType(type, itemNode, implementation);
  }

  private static createMapTypeNode(
    type: OmniDictionaryType,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const mapClass = implementation == false ? 'Map' : 'Map';
    const mapType = new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
    const keyType = TsAstUtils.createTypeNode(type.keyType, true);
    const valueType = TsAstUtils.createTypeNode(type.valueType, true);

    return new Java.GenericType(type, mapType, [keyType, valueType]);
  }
}
