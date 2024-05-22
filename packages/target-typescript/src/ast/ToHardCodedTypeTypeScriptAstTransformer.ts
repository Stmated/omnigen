import {AstTransformer, AstTransformerArguments, OmniTypeKind, TargetOptions} from '@omnigen/core';
import {TsRootNode} from '../ast';
import {TypeScriptAstReducer} from './TypeScriptAstReducer.ts';
import {Code} from '@omnigen/target-code';

export class ToHardCodedTypeTypeScriptAstTransformer implements AstTransformer<TsRootNode> {

  transformAst(args: AstTransformerArguments<TsRootNode, TargetOptions>): void {

    const defaultReducer = args.root.createReducer();
    const reducer: TypeScriptAstReducer = {
      ...defaultReducer,
      ...{
        reduceEdgeType: (n, r) => {

          if (n.omniType.kind == OmniTypeKind.DICTIONARY) {

            const type = n.omniType;
            // const dictionaryClass = ;
            const dictionaryType = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'Record'});
            const keyType = args.root.getAstUtils().createTypeNode(type.keyType, true);
            const valueType = args.root.getAstUtils().createTypeNode(type.valueType, true);

            return new Code.GenericType(type, dictionaryType, [keyType, valueType]);

          } else {
            return defaultReducer.reduceEdgeType(n, r);
          }
        },
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
