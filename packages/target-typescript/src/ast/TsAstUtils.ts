import {CompositionKind, OmniDictionaryType, OmniGenericTargetType, OmniType, OmniTypeKind} from '@omnigen/core';
import {Ts} from '../ast';
import {Java} from '@omnigen/target-java';

export class TsAstUtils {

  public static createTypeNode<T extends OmniType>(type: T, implementation?: boolean): Java.RegularType<T> | Java.GenericType | Java.WildcardType | Ts.CompositionType {

    if (type.kind == OmniTypeKind.DICTIONARY) {
      return this.createMapTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.lowerBound) {
        return new Java.WildcardType(type, TsAstUtils.createTypeNode(type.lowerBound, implementation), implementation);
      } else {
        return new Java.WildcardType(type, undefined, implementation);
      }
    } else if (type.kind == OmniTypeKind.COMPOSITION && (type.compositionKind == CompositionKind.XOR || type.compositionKind == CompositionKind.AND)) {
      return new Ts.CompositionType(type, type.types.map(it => TsAstUtils.createTypeNode(it, implementation)));
    } else {
      return new Java.RegularType<T>(type, implementation);
    }
  }

  private static createGenericTargetTypeNode<T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const baseType = new Java.RegularType(type, implementation);
    const mappedGenericTargetArguments = type.targetIdentifiers.map(it => TsAstUtils.createTypeNode(it.type, implementation));
    return new Java.GenericType(type, baseType, mappedGenericTargetArguments);
  }

  private static createMapTypeNode(
    type: OmniDictionaryType,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const mapClass = implementation == false ? 'Map' : 'Map';
    const mapType = new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
    const keyType = TsAstUtils.createTypeNode(type.keyType, true);
    const valueType = TsAstUtils.createTypeNode(type.valueType, true);

    return new Java.GenericType(type, mapType, [keyType, valueType]);
  }
}
