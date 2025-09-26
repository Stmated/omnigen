import {AstTargetFunctions, DictionaryKind, OmniArrayType, OmniDictionaryType, OmniGenericTargetType, OmniType, OmniTypeKind, TypeNode, UnknownKind} from '@omnigen/api';
import {Ts} from '../ast';
import {OmniUtil} from '@omnigen/core';
import {Code, CodeOptions} from '@omnigen/target-code';

export class TsAstUtils implements AstTargetFunctions {

  public createTypeNode<T extends OmniType>(type: T, implementation?: boolean, immutable?: boolean, map?: Map<OmniType, TypeNode>): TypeNode {

    if (!map) {
      map = new Map<OmniType, TypeNode>();
    }

    const cached = map.get(type);
    if (cached) {
      return cached;
    }

    const typeNode = this.createTypeInternal(type, implementation, immutable ?? false, map);
    map.set(type, typeNode);

    return typeNode;
  }

  private createTypeInternal<T extends OmniType>(
    type: T,
    implementation: boolean | undefined,
    immutable: boolean,
    map: Map<OmniType, TypeNode>,
  ): TypeNode {

    if (type.kind == OmniTypeKind.DICTIONARY) {
      return this.createMapTypeNode(type, implementation, immutable, map);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation, immutable, map);
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return this.createArrayTypeNode(type, implementation, immutable, map);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.upperBound) {
        return new Code.BoundedType(type, new Code.WildcardType(type, implementation), this.createTypeNode(type.upperBound, implementation, immutable, map));
      } else {
        return new Code.WildcardType(type, implementation);
      }
    } else if (OmniUtil.isComposition(type) && type.kind != OmniTypeKind.NEGATION) {
      if (type.inline) {
        return new Ts.CompositionType(type, type.types.map(it => this.createTypeNode(it, implementation, immutable, map)));
      }
    } else if (type.kind == OmniTypeKind.DECORATING) {
      const of = this.createTypeNode(type.of, implementation, immutable, map);
      return new Code.DecoratingTypeNode(of, type);
    } else if (type.kind === OmniTypeKind.INTERFACE && type.inline && type.of.kind === OmniTypeKind.GENERIC_TARGET) {
      return this.createTypeNode(type.of, implementation, immutable, map);
    }

    return new Code.EdgeType<T>(type, implementation);
  }

  private createGenericTargetTypeNode<T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
    immutable: boolean,
    map: Map<OmniType, TypeNode>,
  ): Code.GenericType {

    const baseType = new Code.EdgeType(type, implementation);
    const mappedGenericTargetArguments = type.targetIdentifiers.map(it => this.createTypeNode(it.type, implementation, immutable, map));
    return new Code.GenericType(type, baseType, mappedGenericTargetArguments);
  }

  private createArrayTypeNode<const T extends OmniArrayType>(
    type: T,
    implementation: boolean | undefined,
    immutable: boolean,
    map: Map<OmniType, TypeNode>,
  ): TypeNode<T> {

    const tempTypeNode = new Code.WildcardType({kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.WILDCARD});
    const arrayTypeNode = new Code.ArrayType(type, tempTypeNode, implementation);

    map.set(type, arrayTypeNode);

    arrayTypeNode.itemTypeNode = this.createTypeNode(type.of, implementation, immutable, map);
    return arrayTypeNode;
  }

  private createMapTypeNode(
    type: OmniDictionaryType,
    implementation: boolean | undefined,
    immutable: boolean,
    map: Map<OmniType, TypeNode>,
  ): Code.GenericType {

    const keyType = this.createTypeNode(type.keyType, implementation, immutable, map);
    const valueType = this.createTypeNode(type.valueType, implementation, immutable, map);

    const isClass = (type.dictionaryKind ?? DictionaryKind.CLASS) === DictionaryKind.CLASS;
    if (isClass) {

      const edgeName = immutable ? 'ReadOnlyMap' : 'Map';
      const mapType = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: edgeName}});
      return new Code.GenericType(type, mapType, [keyType, valueType]);
    } else {

      const recordType = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'Record'}});
      const genericRecordType = new Code.GenericType(type, recordType, [keyType, valueType]);

      if (immutable) {
        const readOnlyType = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'ReadOnly'}});
        return new Code.GenericType(type, readOnlyType, [genericRecordType]);
      } else {
        return genericRecordType;
      }
    }
  }
}
