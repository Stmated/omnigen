import {Code, CodeUtil} from '@omnigen/target-code';
import {AstTransformer, OmniHardcodedReferenceType, OmniTypeKind, RootAstNode, TargetFeatures, TargetOptions, TypeNode} from '@omnigen/api';
import {OmniUtil} from '@omnigen/core';
import {CSharpRootNode} from './CSharpRootNode';
import {CSharpOptions} from '../options';
import {CSharpAstTransformerArguments} from './index';

/**
 * Replace higher level "delegate" with C#-specific interfaces and call-sites.
 */
export class DelegatesToCSharpAstTransformer implements AstTransformer<CSharpRootNode, TargetOptions & CSharpOptions> {

  transformAst(args: CSharpAstTransformerArguments): void {

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceDelegate: n => {

        let hardType: OmniHardcodedReferenceType;
        const extraGenericArgs: TypeNode[] = [];
        if (n.returnType.omniType.kind === OmniTypeKind.VOID) {
          hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System'], edgeName: 'Action'}};
        } else if (n.returnType.omniType.kind === OmniTypeKind.BOOL) {

          if (n.parameterTypes.length == 1) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System'], edgeName: 'Predicate'}};
          } else {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System'], edgeName: 'Func'}};
            extraGenericArgs.push(n.returnType);
          }

        } else {

          hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System'], edgeName: 'Func'}};
          extraGenericArgs.push(n.returnType);
        }

        const genericArguments = n.parameterTypes.map(it => this.asGenericCompatibleTypeNode(args.root, it, args.features));
        genericArguments.push(...extraGenericArgs);

        return new Code.GenericType(hardType, new Code.EdgeType(hardType), genericArguments);
      },
      reduceDelegateCall: n => {
        return new Code.MethodCall(n.target, n.args);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private asGenericCompatibleTypeNode(root: RootAstNode, typeNode: TypeNode, features: TargetFeatures): TypeNode {

    if (features.primitiveGenerics) {
      return typeNode;
    }

    const omniType = typeNode.omniType;
    if (OmniUtil.isPrimitive(omniType)) {
      return root.getAstUtils().createTypeNode(CodeUtil.getGenericCompatibleType(omniType));
    }

    return typeNode;
  }
}
