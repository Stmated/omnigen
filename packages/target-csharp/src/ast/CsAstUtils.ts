import {AstTargetFunctions, OmniArrayType, OmniDictionaryType, OmniGenericTargetType, OmniType, OmniTypeKind, TypeNode} from '@omnigen/core';
import {Code} from '@omnigen/target-code';

export class CsAstUtils implements AstTargetFunctions {

  public createTypeNode<T extends OmniType>(type: T, implementation?: boolean): TypeNode {

    if (type.kind == OmniTypeKind.DICTIONARY) {
      return this.createMapTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return this.createArrayTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.upperBound) {
        return new Code.BoundedType(type, new Code.WildcardType(type, implementation), this.createTypeNode(type.upperBound, implementation));
      } else {
        return new Code.WildcardType(type, implementation);
      }
    } else if (type.kind == OmniTypeKind.DECORATING) {
      const of = this.createTypeNode(type.of, implementation);
      return new Code.DecoratingTypeNode(of, type);
    } else if (type.kind === OmniTypeKind.INTERFACE && type.inline && type.of.kind === OmniTypeKind.GENERIC_TARGET) {
      return this.createTypeNode(type.of, implementation);
    }

    return new Code.EdgeType<T>(type, implementation);
  }

  private createGenericTargetTypeNode<T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
  ): Code.GenericType {

    const baseType = new Code.EdgeType(type, implementation);
    const mappedGenericTargetArguments = type.targetIdentifiers.map(it => this.createTypeNode(it.type, implementation));
    return new Code.GenericType(type, baseType, mappedGenericTargetArguments);
  }

  private createArrayTypeNode<const T extends OmniArrayType>(
    type: T,
    implementation: boolean | undefined,
  ): TypeNode<T> {

    const itemNode = this.createTypeNode(type.of);
    return new Code.ArrayType(type, itemNode, implementation);
  }

  private createMapTypeNode(
    type: OmniDictionaryType,
    implementation: boolean | undefined,
  ): Code.GenericType {

    const mapClass = implementation == false ? 'Map' : 'Map';
    const mapType = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
    const keyType = this.createTypeNode(type.keyType, true);
    const valueType = this.createTypeNode(type.valueType, true);

    return new Code.GenericType(type, mapType, [keyType, valueType]);
  }
}
