import {AstTransformer, AstTransformerArguments, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/core';
import {Java} from '@omnigen/target-java';
import {TsAstUtils, TsRootNode} from '../ast';
import {TypeScriptAstReducer} from './TypeScriptAstReducer.ts';

export class ToHardCodedTypeTypeScriptAstTransformer implements AstTransformer<Java.JavaAstRootNode> {

  transformAst(args: AstTransformerArguments<TsRootNode, PackageOptions & TargetOptions>): void {

    const defaultReducer = args.root.createReducer();
    const reducer: TypeScriptAstReducer = {
      ...defaultReducer,
      ...{
        reduceEdgeType: (n, r) => {

          if (n.omniType.kind == OmniTypeKind.DICTIONARY) {

            const type = n.omniType;
            const mapClass = 'Map';
            const mapType = new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
            const keyType = TsAstUtils.createTypeNode(type.keyType, true);
            const valueType = TsAstUtils.createTypeNode(type.valueType, true);

            return new Java.GenericType(type, mapType, [keyType, valueType]);

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
