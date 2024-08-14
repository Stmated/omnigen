import {
  AstTargetFunctions,
  AstTransformer,
  AstTransformerArguments,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetType,
  OmniType,
  OmniTypeKind,
  TargetOptions,
  UnknownKind,
} from '@omnigen/api';
import {Ts} from '../ast';
import {TypeScriptAstReducer} from './TypeScriptAstReducer.ts';
import {Code} from '@omnigen/target-code';
import {TypeScriptOptions} from '../options';

export class ToTypeScriptAstTransformer implements AstTransformer<Ts.TsRootNode, TargetOptions & TypeScriptOptions> {

  private static readonly _MAP_GENERIC_SOURCES = new Map<String, OmniGenericSourceType>();

  transformAst(args: AstTransformerArguments<Ts.TsRootNode, TargetOptions & TypeScriptOptions>): void {

    const defaultReducer = args.root.createReducer();
    const astUtils = args.root.getAstUtils();

    const reducer: TypeScriptAstReducer = {
      ...defaultReducer,
      ...{
        reduceEdgeType: (n, r) => {

          if (n.omniType.kind === OmniTypeKind.DICTIONARY) {

            const type = n.omniType;

            const source = ToTypeScriptAstTransformer.getMapGenericSource(n.implementation ?? false);
            const genericTargetType: OmniGenericTargetType = {
              kind: OmniTypeKind.GENERIC_TARGET,
              source: source,
              targetIdentifiers: [
                {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: type.keyType, sourceIdentifier: source.sourceIdentifiers[0]},
                {kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER, type: type.valueType, sourceIdentifier: source.sourceIdentifiers[1]},
              ],
            };

            return astUtils.createTypeNode(genericTargetType, n.implementation);

          } else {
            return defaultReducer.reduceEdgeType(n, r);
          }
        },

        reduceWildcardType: n => {
          return ToTypeScriptAstTransformer.getUnknownClassName(n.omniType.unknownKind ?? args.options.unknownType, n.implementation, astUtils).setId(n.id);
        },
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }

  public static getUnknownClassName(
    unknownKind: UnknownKind,
    implementation: boolean | undefined,
    astUtils: AstTargetFunctions,
  ): Code.TypeNode {

    switch (unknownKind) {
      case UnknownKind.DYNAMIC_OBJECT: {

        const targetKeyType: OmniType = {kind: OmniTypeKind.STRING};
        const targetValueType: OmniType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'any'}};

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
      case UnknownKind.ANY:
        return new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'any'}}, implementation);
      case UnknownKind.OBJECT:
        return new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'object'}}, implementation);
      case UnknownKind.WILDCARD:
        return new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'unknown'}}, implementation);
    }
  }

  private static getMapGenericSource(implementation: boolean): OmniGenericSourceType {

    const objectName = implementation ? 'Record' : 'Record';
    let source = ToTypeScriptAstTransformer._MAP_GENERIC_SOURCES.get(objectName);

    if (!source) {
      const mapType: OmniType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: objectName}};

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

      ToTypeScriptAstTransformer._MAP_GENERIC_SOURCES.set(objectName, source);
    }

    return source;
  }
}
