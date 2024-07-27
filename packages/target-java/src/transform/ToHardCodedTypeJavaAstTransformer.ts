import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {AstTargetFunctions, OmniArrayKind, OmniGenericSourceIdentifierType, OmniGenericSourceType, OmniGenericTargetType, OmniType, OmniTypeKind, UnknownKind} from '@omnigen/core';
import * as Java from '../ast/JavaAst';
import {assertDefined} from '@omnigen/core-util';
import {render} from '@omnigen/target-code';

export class ToHardCodedTypeJavaAstTransformer extends AbstractJavaAstTransformer {

  private static readonly _MAP_GENERIC_SOURCES = new Map<String, OmniGenericSourceType>();
  private static readonly _LIST_GENERIC_SOURCES = new Map<String, OmniGenericSourceType>();

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultReducer = args.root.createReducer();
    const astUtils = args.root.getAstUtils();

    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceWildcardType: n => {
        return ToHardCodedTypeJavaAstTransformer.getUnknownClassName(n.omniType.unknownKind ?? args.options.unknownType, n.implementation, astUtils).setId(n.id);
      },
      reduceEdgeType: (n, r) => {

        if (n.omniType.kind == OmniTypeKind.DICTIONARY) {

          const type = n.omniType;
          const implementation = n.implementation ?? false;
          const source = ToHardCodedTypeJavaAstTransformer.getMapGenericSource(implementation);
          const genericTargetType: OmniGenericTargetType = {
            kind: OmniTypeKind.GENERIC_TARGET,
            source: source,
            targetIdentifiers: [
              {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: type.keyType, sourceIdentifier: source.sourceIdentifiers[0]},
              {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: type.valueType, sourceIdentifier: source.sourceIdentifiers[1]},
            ],
          };

          return astUtils.createTypeNode(genericTargetType, implementation).reduce(r);

        } else {
          return defaultReducer.reduceEdgeType(n, r);
        }
      },
      reduceArrayType: (n, r) => {

        const reduced = defaultReducer.reduceArrayType(n, r);

        if (reduced && reduced instanceof Java.ArrayType) {
          let baseType: string | undefined = undefined;
          if (reduced.omniType.arrayKind === OmniArrayKind.SET) {
            baseType = n.implementation ? `HashSet` : `Set`;
          } else if (reduced.omniType.arrayKind === OmniArrayKind.LIST) {
            baseType = reduced.implementation ? `ArrayList` : `List`;
          }

          if (baseType) {

            const implementation = n.implementation ?? false;
            const source = ToHardCodedTypeJavaAstTransformer.getListGenericSource(baseType);
            const genericTargetType: OmniGenericTargetType = {
              kind: OmniTypeKind.GENERIC_TARGET,
              source: source,
              targetIdentifiers: [
                {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: n.itemTypeNode.omniType, sourceIdentifier: source.sourceIdentifiers[0]},
              ],
            };

            return astUtils.createTypeNode(genericTargetType, implementation).reduce(r);
          }
        }

        // Keep it as-is, and it will be rendered as something special by its renderer.
        return reduced;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  public static getUnknownClassName(
    unknownKind: UnknownKind,
    implementation: boolean | undefined,
    astUtils: AstTargetFunctions,
  ): Java.TypeNode {

    switch (unknownKind) {
      // case UnknownKind.DYNAMIC_OBJECT:
      //   // NOTE: Should probably be a map instead. But additionalProperties becomes `Map<String, Map<String, Object>>` which is a bit weird.
      //   return new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['java', 'lang'], edgeName: 'Object'}}, implementation);
      case UnknownKind.DYNAMIC_OBJECT: {

        const targetKeyType: OmniType = {kind: OmniTypeKind.STRING};
        const targetValueType: OmniType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['java', 'lang'], edgeName: 'Object'}};

        const source = this.getMapGenericSource(false);
        const genericTargetType: OmniGenericTargetType = {
          kind: OmniTypeKind.GENERIC_TARGET,
          source: source,
          targetIdentifiers: [
            {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: targetKeyType, sourceIdentifier: source.sourceIdentifiers[0]},
            {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: targetValueType, sourceIdentifier: source.sourceIdentifiers[1]},
          ],
        };

        return astUtils.createTypeNode(genericTargetType, implementation);
      }
      case UnknownKind.DYNAMIC_NATIVE:
      case UnknownKind.DYNAMIC:
      case UnknownKind.OBJECT:
      case UnknownKind.ANY:
        return new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['java', 'lang'], edgeName: 'Object'}}, implementation);
      case UnknownKind.WILDCARD:
        return new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: '?'}}, implementation);
    }
  }

  private static getMapGenericSource(implementation: boolean): OmniGenericSourceType {

    const objectName = implementation ? 'HashMap' : 'Map';
    let source = ToHardCodedTypeJavaAstTransformer._MAP_GENERIC_SOURCES.get(objectName);

    if (!source) {
      const mapType: OmniType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['java', 'util'], edgeName: objectName}};

      const sourceKeyType: OmniGenericSourceIdentifierType = {kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER, placeholderName: 'K'};
      const sourceValueType: OmniGenericSourceIdentifierType = {kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER, placeholderName: 'V'};

      source = Object.freeze({
        kind: OmniTypeKind.GENERIC_SOURCE,
        of: mapType,
        sourceIdentifiers: [
          sourceKeyType,
          sourceValueType,
        ],
      });

      ToHardCodedTypeJavaAstTransformer._MAP_GENERIC_SOURCES.set(objectName, source);
    }

    return source;
  }

  private static getListGenericSource(objectName: string): OmniGenericSourceType {

    let source = ToHardCodedTypeJavaAstTransformer._LIST_GENERIC_SOURCES.get(objectName);

    if (!source) {
      const mapType: OmniType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['java', 'util'], edgeName: objectName}};

      const itemType: OmniGenericSourceIdentifierType = {kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER, placeholderName: 'T'};

      source = Object.freeze({
        kind: OmniTypeKind.GENERIC_SOURCE,
        of: mapType,
        sourceIdentifiers: [
          itemType,
        ],
      });

      ToHardCodedTypeJavaAstTransformer._LIST_GENERIC_SOURCES.set(objectName, source);
    }

    return source;
  }
}
