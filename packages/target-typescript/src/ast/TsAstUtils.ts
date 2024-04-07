import {AstTargetFunctions, OmniArrayType, OmniDictionaryType, OmniGenericTargetType, OmniType, OmniTypeKind, TypeNode} from '@omnigen/core';
import {Ts} from '../ast';
import {Java} from '@omnigen/target-java';
import {OmniUtil} from '@omnigen/core-util';

export class TsAstUtils implements AstTargetFunctions {

  public createTypeNode<T extends OmniType>(type: T, implementation?: boolean): TypeNode {

    if (type.kind == OmniTypeKind.DICTIONARY) {
      return this.createMapTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return this.createArrayTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.upperBound) {
        return new Java.BoundedType(type, new Java.WildcardType(type, implementation), this.createTypeNode(type.upperBound, implementation));
      } else {
        return new Java.WildcardType(type, implementation);
      }
    } else if (OmniUtil.isComposition(type) && type.kind != OmniTypeKind.NEGATION) {
      if (type.inline) {
        return new Ts.CompositionType(type, type.types.map(it => this.createTypeNode(it, implementation)));
      }
    } else if (type.kind == OmniTypeKind.DECORATING) {
      const of = this.createTypeNode(type.of, implementation);
      return new Java.DecoratingTypeNode(of, type);
    } else if (type.kind === OmniTypeKind.INTERFACE && type.inline && type.of.kind === OmniTypeKind.GENERIC_TARGET) {
      return this.createTypeNode(type.of, implementation);
    }

    return new Java.EdgeType<T>(type, implementation);
  }

  private createGenericTargetTypeNode<T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const baseType = new Java.EdgeType(type, implementation);
    const mappedGenericTargetArguments = type.targetIdentifiers.map(it => this.createTypeNode(it.type, implementation));
    return new Java.GenericType(type, baseType, mappedGenericTargetArguments);
  }

  private createArrayTypeNode<const T extends OmniArrayType>(
    type: T,
    implementation: boolean | undefined,
  ): TypeNode<T> {

    const itemNode = this.createTypeNode(type.of);
    return new Java.ArrayType(type, itemNode, implementation);
  }

  private createMapTypeNode(
    type: OmniDictionaryType,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const mapClass = implementation == false ? 'Map' : 'Map';
    const mapType = new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
    const keyType = this.createTypeNode(type.keyType, true);
    const valueType = this.createTypeNode(type.valueType, true);

    return new Java.GenericType(type, mapType, [keyType, valueType]);
  }
}
