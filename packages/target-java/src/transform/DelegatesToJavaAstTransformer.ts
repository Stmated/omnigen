import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {JavaUtil} from '../util';
import {OmniHardcodedReferenceType, OmniTypeKind, RootAstNode, TargetFeatures, TypeNode} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';
import * as Java from '../ast/JavaAst';

/**
 * Replace higher level "delegate" with Java-specific interfaces and call-sites.
 */
export class DelegatesToJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    // TODO: Replace the hardcoded "java.util.etc.etc" into a type path -- for easier handling of rendering/handling of the path
    const delegateToMethodName = new Map<number, string>();
    const nameResolver = args.root.getNameResolver();

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceDelegate: n => {

        let hardType: OmniHardcodedReferenceType | undefined = undefined;
        let methodName: string | undefined = undefined;
        if (n.returnType.omniType.kind === OmniTypeKind.VOID) {

          if (n.parameterTypes.length == 0) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.lang.Runnable')};
            methodName = 'run';
          } else if (n.parameterTypes.length == 1) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.Consumer')};
            methodName = 'accept';
          } else if (n.parameterTypes.length == 2) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.BiConsumer')};
            methodName = 'accept';
          } else {
            throw new Error(`Do not know how to convert delegate '${n}' into a consumer`);
          }

        } else if (n.returnType.omniType.kind === OmniTypeKind.BOOL) {

          if (n.parameterTypes.length == 0) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.Supplier')};
            methodName = 'get';
          } else if (n.parameterTypes.length == 1) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.Predicate')};
            methodName = 'test';
          } else if (n.parameterTypes.length == 2) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.BiPredicate')};
            methodName = 'test';
          } else {
            throw new Error(`Do not know how to convert delegate '${n}' into a predicate`);
          }
        } else if (!OmniUtil.isNullableType(n.returnType.omniType)) {

          if (n.returnType.omniType.kind === OmniTypeKind.INTEGER || n.returnType.omniType.kind === OmniTypeKind.INTEGER_SMALL) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.ToIntFunction')};
            methodName = 'applyAsInt';
          } else if (n.returnType.omniType.kind === OmniTypeKind.DOUBLE) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.ToDoubleFunction')};
            methodName = 'applyAsDouble';
          } else if (n.returnType.omniType.kind === OmniTypeKind.LONG) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.ToLongFunction')};
            methodName = 'applyAsLong';
          }
        }

        const parameterTypes = [...n.parameterTypes];

        if (!hardType && n.returnType) {

          if (n.parameterTypes.length == 1) {
            const sourceType = n.parameterTypes[0].omniType;
            const common = OmniUtil.getCommonDenominatorBetween(sourceType, n.returnType.omniType, args.features);
            if (common && common.type == sourceType) {
              hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.UnaryOperator')};
            } else {
              hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.Function')};
              parameterTypes.push(n.returnType);
            }
          } else if (n.parameterTypes.length == 2) {
            hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: nameResolver.parse('java.util.function.BiFunction')};
            parameterTypes.push(n.returnType);
          }
        }

        // if (!hardType) {
        //   if (n.parameterTypes.length == 1) {
        //     hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'java.util.function.Function'};
        //   } else if (n.parameterTypes.length == 2) {
        //     hardType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'java.util.function.BiFunction'};
        //   }
        // }

        if (!hardType) {
          throw new Error(`Do not know how to convert delegate '${n}' into a Java FunctionalInterface`);
        }

        if (methodName) {
          delegateToMethodName.set(n.id, methodName);
        }

        return new Java.GenericType(hardType, new Java.EdgeType(hardType),
          parameterTypes.map(it => this.asGenericCompatibleTypeNode(args.root, it, args.features)),
        );
      },
      reduceDelegateCall: n => {

        const methodName = delegateToMethodName.get(n.delegateRef.targetId) ?? 'apply';
        return new Java.MethodCall(new Java.MemberAccess(n.target, new Java.Identifier(methodName)), n.args);
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
