import {AbstractJavaAstTransformer, Java, JavaAstTransformerArgs, JavaUtil} from '@omnigen/target-java';
import {OmniHardcodedReferenceType, OmniTypeKind, RootAstNode, TargetFeatures, TypeNode} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';

/**
 * Replace higher level "delegate" with C#-specific interfaces and call-sites.
 */
export class DelegatesToCSharpAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceDelegate: n => {

        let hardType: OmniHardcodedReferenceType;
        const extraGenericArgs: TypeNode[] = [];
        if (n.returnType.omniType.kind === OmniTypeKind.VOID) {
          hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'System.Action'};
        } else if (n.returnType.omniType.kind === OmniTypeKind.BOOL) {

          if (n.parameterTypes.length == 1) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'System.Predicate'};
          } else {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'System.Func'};
            extraGenericArgs.push(n.returnType);
          }

        } else {

          hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'System.Func'};
          extraGenericArgs.push(n.returnType);
        }

        const genericArguments = n.parameterTypes.map(it => this.asGenericCompatibleTypeNode(args.root, it, args.features));
        genericArguments.push(...extraGenericArgs);

        return new Java.GenericType(hardType, new Java.EdgeType(hardType), genericArguments);
      },
      reduceDelegateCall: n => {
        // const methodName = delegateToMethodName.get(n.delegateRef.targetId) ?? 'apply';
        // const target = new Java.

        return new Java.MethodCall(n.target, n.args);
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
      return root.getAstUtils().createTypeNode(JavaUtil.getGenericCompatibleType(omniType));
    }

    return typeNode;
  }
}
