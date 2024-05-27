import {AstNode, AstVisitor, VisitFn, VisitResult} from '@omnigen/core';
import {createCodeFreeTextVisitor} from '../';
import * as Code from '../ast/Code';
import {AstFreeTextVisitor} from './FreeTextVisitor.ts';
import {AbstractCodeNode} from '../ast/AbstractCodeNode.ts';

export type CodeVisitFn<N extends AstNode, R> = VisitFn<N, R, CodeVisitor<R>>;

export interface CodeVisitor<R> extends AstVisitor<R>, AstFreeTextVisitor<R> {

  visitEdgeType: CodeVisitFn<Code.EdgeType, R>;
  visitWildcardType: CodeVisitFn<Code.WildcardType, R>;
  visitBoundedType: CodeVisitFn<Code.BoundedType, R>;
  visitArrayType: CodeVisitFn<Code.ArrayType, R>;
  visitGenericType: CodeVisitFn<Code.GenericType, R>;
  visitIdentifier: CodeVisitFn<Code.Identifier, R>;
  visitGetterIdentifier: CodeVisitFn<Code.GetterIdentifier, R>;
  visitSetterIdentifier: CodeVisitFn<Code.SetterIdentifier, R>;
  visitToken: CodeVisitFn<Code.TokenNode, R>;
  visitAnnotationList: CodeVisitFn<Code.AnnotationList, R>;
  visitParameter: CodeVisitFn<Code.Parameter, R>;
  visitParameterList: CodeVisitFn<Code.ParameterList, R>;
  visitBinaryExpression: CodeVisitFn<Code.BinaryExpression, R>;
  visitModifier: CodeVisitFn<Code.Modifier, R>;
  visitField: CodeVisitFn<Code.Field, R>;
  visitComment: CodeVisitFn<Code.Comment, R>;
  visitFieldBackedGetter: CodeVisitFn<Code.FieldBackedGetter, R>;
  visitFieldBackedSetter: CodeVisitFn<Code.FieldBackedSetter, R>;
  visitMethodDeclaration: CodeVisitFn<Code.MethodDeclaration, R>;
  visitMethodDeclarationSignature: CodeVisitFn<Code.MethodDeclarationSignature, R>;
  visitAbstractMethodDeclaration: CodeVisitFn<Code.AbstractMethodDeclaration, R>;
  visitExtendsDeclaration: CodeVisitFn<Code.ExtendsDeclaration, R>;
  visitImplementsDeclaration: CodeVisitFn<Code.ImplementsDeclaration, R>;
  visitTypeList: CodeVisitFn<Code.TypeList, R>;
  visitLiteral: CodeVisitFn<Code.Literal, R>;
  visitIfStatement: CodeVisitFn<Code.IfStatement, R>;
  visitIfElseStatement: CodeVisitFn<Code.IfElseStatement, R>;
  visitTernaryExpression: CodeVisitFn<Code.TernaryExpression, R>;
  visitImportStatement: CodeVisitFn<Code.ImportStatement, R>;
  visitImportList: CodeVisitFn<Code.ImportList, R>;
  visitMethodCall: CodeVisitFn<Code.MethodCall, R>;
  visitNewStatement: CodeVisitFn<Code.NewStatement, R>;
  visitThrowStatement: CodeVisitFn<Code.ThrowStatement, R>;
  visitArgumentList: CodeVisitFn<Code.ArgumentList, R>;
  visitReturnStatement: CodeVisitFn<Code.ReturnStatement, R>;
  visitVariableDeclaration: CodeVisitFn<Code.VariableDeclaration, R>;
  visitAnnotation: CodeVisitFn<Code.Annotation, R>;
  visitAnnotationKeyValuePairList: CodeVisitFn<Code.AnnotationKeyValuePairList, R>;
  visitAnnotationKeyValuePair: CodeVisitFn<Code.AnnotationKeyValuePair, R>;
  visitHardCoded: CodeVisitFn<Code.HardCoded, R>;
  visitBlock: CodeVisitFn<Code.Block, R>;
  visitPackage: CodeVisitFn<Code.PackageDeclaration, R>;
  visitPredicate: CodeVisitFn<Code.Predicate, R>;
  visitModifierList: CodeVisitFn<Code.ModifierList, R>;
  visitCast: CodeVisitFn<Code.Cast, R>;
  visitObjectDeclaration: CodeVisitFn<Code.AbstractObjectDeclaration, R>;
  visitObjectDeclarationBody: CodeVisitFn<Code.AbstractObjectDeclaration, R>;
  visitClassDeclaration: CodeVisitFn<Code.ClassDeclaration, R>;
  visitGenericTypeDeclarationList: CodeVisitFn<Code.GenericTypeDeclarationList, R>;
  visitGenericTypeDeclaration: CodeVisitFn<Code.GenericTypeDeclaration, R>;
  visitInterfaceDeclaration: CodeVisitFn<Code.InterfaceDeclaration, R>;
  visitEnumDeclaration: CodeVisitFn<Code.EnumDeclaration, R>;
  visitEnumItem: CodeVisitFn<Code.EnumItem, R>;
  visitEnumItemList: CodeVisitFn<Code.EnumItemList, R>;
  visitCompilationUnit: CodeVisitFn<Code.CompilationUnit, R>;
  visitConstructor: CodeVisitFn<Code.ConstructorDeclaration, R>;
  visitConstructorParameterList: CodeVisitFn<Code.ConstructorParameterList, R>;
  visitConstructorParameter: CodeVisitFn<Code.ConstructorParameter, R>;
  visitStatement: CodeVisitFn<Code.Statement, R>;
  visitSuperConstructorCall: CodeVisitFn<Code.SuperConstructorCall, R>;
  visitClassName: CodeVisitFn<Code.ClassName, R>;
  visitClassReference: CodeVisitFn<Code.ClassReference, R>;
  visitArrayInitializer: CodeVisitFn<Code.ArrayInitializer, R>;
  visitStaticMemberReference: CodeVisitFn<Code.StaticMemberReference, R>;
  visitSelfReference: CodeVisitFn<Code.SelfReference, R>;
  visitNodes: CodeVisitFn<Code.Nodes, R>;
  visitDecoratingTypeNode: CodeVisitFn<Code.DecoratingTypeNode, R>;

  visitDeclarationReference: CodeVisitFn<Code.DeclarationReference, R>;
  visitFieldReference: CodeVisitFn<Code.FieldReference, R>;

  visitNamespace: CodeVisitFn<Code.Namespace, R>;
  visitNamespaceBlock: CodeVisitFn<Code.NamespaceBlock, R>;

  visitTypeNamespace: CodeVisitFn<Code.TypePath, R>;

  visitDelegate: CodeVisitFn<Code.Delegate, R>;
  visitDelegateCall: CodeVisitFn<Code.DelegateCall, R>;

  visitMemberAccess: CodeVisitFn<Code.MemberAccess, R>;

  visitGenericRef: <C extends AstNode>(n: Code.GenericRef<C>, v: CodeVisitor<R>) => VisitResult<R>;

  visitVirtualAnnotationNode: CodeVisitFn<Code.VirtualAnnotationNode, R>;
}

export const createCodeVisitor = <R>(partial?: Partial<CodeVisitor<R>>, noop?: R | undefined): Readonly<CodeVisitor<R>> => {
  return createCodeVisitorInternal<R>(partial, noop);
};

const createCodeVisitorInternal = <R>(partial?: Partial<CodeVisitor<R>>, noop?: R | undefined): Readonly<CodeVisitor<R>> => {

  return {
    ...createCodeFreeTextVisitor<R>(undefined, noop),
    visitEdgeType: () => noop,
    visitWildcardType: () => noop,
    visitBoundedType: (node, visitor) => [node.type.visit(visitor), node.lowerBound?.visit(visitor), node.upperBound?.visit(visitor)],
    visitArrayType: (node, visitor) => node.of.visit(visitor),
    visitGenericType: (node, visitor) => [
      node.baseType.visit(visitor),
      node.genericArguments.map(it => it.visit(visitor)),
    ],
    visitParameter: (node, visitor) => {
      if (node.annotations) {
        return [
          node.annotations.visit(visitor),
          node.type.visit(visitor),
          node.identifier.visit(visitor),
        ];
      } else {
        return [
          node.type.visit(visitor),
          node.identifier.visit(visitor),
        ];
      }
    },
    visitParameterList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitIdentifier: () => noop,
    visitGetterIdentifier: (n, v) => n.identifier.visit(v),
    visitSetterIdentifier: (n, v) => n.identifier.visit(v),
    visitToken: () => noop,
    visitBinaryExpression: (node, visitor) => [
      node.left.visit(visitor),
      node.token.visit(visitor),
      node.right.visit(visitor),
    ],
    visitModifier: () => noop,
    visitField: (node, visitor) => {
      const results: VisitResult<R>[] = [];
      if (node.comments) {
        results.push(node.comments.visit(visitor));
      }
      if (node.annotations) {
        results.push(node.annotations.visit(visitor));
      }
      if (node.modifiers) {
        results.push(node.modifiers.visit(visitor));
      }
      results.push(node.type.visit(visitor));
      results.push(node.identifier.visit(visitor));
      if (node.initializer) {
        results.push(node.initializer.visit(visitor));
      }

      return results;
    },

    visitComment: (node, visitor) => node.text.visit(visitor),

    visitFieldBackedGetter: (n, v) => [n.fieldRef.visit(v), n.getterName?.visit(v), n.comments?.visit(v), n.annotations?.visit(v)],
    visitFieldBackedSetter: (n, v) => [n.fieldRef.visit(v), n.comments?.visit(v), n.annotations?.visit(v)],
    visitMethodDeclaration: (node, visitor) => node.body
      ? [node.signature.visit(visitor), node.body.visit(visitor)]
      : node.signature.visit(visitor),
    visitMethodDeclarationSignature: (node, visitor) => {
      const results: VisitResult<R>[] = [];
      if (node.comments) {
        results.push(node.comments.visit(visitor));
      }
      if (node.annotations) {
        results.push(node.annotations.visit(visitor));
      }
      if (node.modifiers) {
        results.push(node.modifiers.visit(visitor));
      }
      results.push(node.type.visit(visitor));
      results.push(node.identifier.visit(visitor));
      if (node.parameters) {
        results.push(node.parameters.visit(visitor));
      }
      if (node.throws) {
        results.push(node.throws.visit(visitor));
      }
      return results;
    },
    visitAbstractMethodDeclaration: (node, visitor) => node.signature.visit(visitor),
    visitExtendsDeclaration: (node, visitor) => node.types.visit(visitor),
    visitImplementsDeclaration: (node, visitor) => node.types.visit(visitor),
    visitTypeList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitLiteral: () => noop,
    visitIfStatement: (node, visitor) => [
      node.predicate.visit(visitor),
      node.body.visit(visitor),
    ],
    visitIfElseStatement: (n, v) => n.ifStatements.map(it => it.visit(v)).concat(n.elseBlock?.visit(v)),
    visitTernaryExpression: (n, v) => [
      n.predicate.visit(v),
      n.passing.visit(v),
      n.failing.visit(v),
    ],
    visitImportStatement: (n, v) => n.type.visit(v),
    visitImportList: (n, v) => n.children.map(it => it.visit(v)),
    visitMethodCall: (n, v) => [
      n.target.visit(v),
      // node.methodName.visit(visitor),
      n.methodArguments?.visit(v),
    ],
    visitNewStatement: (n, v) => [
      n.type.visit(v),
      n.constructorArguments?.visit(v),
    ],
    visitThrowStatement: (n, v) => [
      n.expression.visit(v),
    ],
    visitArgumentList: (n, v) => n.children.map(it => it.visit(v)),
    visitReturnStatement: (n, v) => n.expression.visit(v),
    visitVariableDeclaration: (n, v) => [
      n.type?.visit(v),
      n.identifier.visit(v),
      n.initializer?.visit(v),
    ],
    visitDeclarationReference: () => noop,
    visitAnnotationList: (n, v) => n.children.map(it => it.visit(v)),
    visitAnnotation: (n, v) => n.pairs
      ? [n.type.visit(v), n.pairs.visit(v)]
      : n.type.visit(v),
    visitAnnotationKeyValuePairList: (n, v) => n.children.map(it => it.visit(v)),
    visitAnnotationKeyValuePair: (n, v) => n.key
      ? [n.key.visit(v), n.value.visit(v)]
      : n.value.visit(v),
    visitVirtualAnnotationNode: () => noop,
    visitHardCoded: () => noop,
    visitBlock: (n, v) => n.children.map(it => it.visit(v)),
    visitPackage: () => noop,
    visitPredicate: (n, v) => v.visitBinaryExpression(n, v),
    visitModifierList: (n, v) => n.children.map(it => it.visit(v)),
    visitCast: (n, v) => [
      n.expression.visit(v),
      n.toType.visit(v),
    ],
    visitObjectDeclaration: (n, v) => {
      const result: VisitResult<R>[] = [];

      // TODO: This is likely to cause trouble for other parts of the code -- might need to be removed! The ReorderMembersTransformer needs to come up with another solution
      result.push(n.type.visit(v));

      if (n.comments) {
        result.push(n.comments.visit(v));
      }
      if (n.annotations) {
        result.push(n.annotations.visit(v));
      }
      result.push(n.modifiers.visit(v));
      result.push(n.name.visit(v));

      if (n.genericParameterList) {
        result.push(v.visitGenericTypeDeclarationList(n.genericParameterList, v));
      }

      if (n.extends) {
        result.push(n.extends.visit(v));
      }
      if (n.implements) {
        result.push(n.implements.visit(v));
      }

      result.push(v.visitObjectDeclarationBody(n, v));

      return result;
    },
    visitObjectDeclarationBody: (n, v) => n.body.visit(v),
    visitClassDeclaration: (n, v) => v.visitObjectDeclaration(n, v),
    visitGenericTypeDeclarationList: (n, v) => n.types.map(it => it.visit(v)),
    visitGenericTypeDeclaration: (n, v) => [
      n.name.visit(v),
      n.lowerBounds?.visit(v),
      n.upperBounds?.visit(v),
    ],
    visitInterfaceDeclaration: (node, visitor) => visitor.visitObjectDeclaration(node, visitor),
    visitEnumDeclaration: (node, visitor) => visitor.visitObjectDeclaration(node, visitor),
    visitEnumItem: (n, v) => [
      n.comment?.visit(v),
      n.identifier.visit(v),
      n.value.visit(v),
    ],
    visitEnumItemList: (n, v) => n.children.map(it => it.visit(v)),
    visitFieldReference: () => noop,
    visitCompilationUnit: (n, v) => [
      n.packageDeclaration.visit(v),
      n.imports.visit(v),
      n.children.map(it => it.visit(v)),
    ],
    visitConstructor: (n, v) => [
      n.modifiers.visit(v),
      n.parameters?.visit(v),
      n.comments?.visit(v),
      n.annotations?.visit(v),
      n.superCall?.visit(v),
      n.body?.visit(v),
    ],

    visitConstructorParameterList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitConstructorParameter: (n, v) => [
      v.visitParameter(n, v),
      n.ref.visit(v),
    ],

    visitStatement: (node, visitor) => node.child.visit(visitor),
    visitSuperConstructorCall: (node, visitor) => node.arguments.visit(visitor),
    visitClassName: (node, visitor) => node.type.visit(visitor),
    visitClassReference: (node, visitor) => node.className.visit(visitor),
    visitArrayInitializer: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitStaticMemberReference: (node, visitor) => [node.target.visit(visitor), node.member.visit(visitor)],
    visitSelfReference: () => noop,
    visitNodes: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitDecoratingTypeNode: (n, v) => n.of.visit(v),

    visitNamespace: (n, v) => [n.name.visit(v), n.block.visit(v)],
    visitNamespaceBlock: (n, v) => n.block.visit(v),

    visitTypeNamespace: (n, v) => [
      ...n.parts.map(it => it.visit(v)),
      n.leaf.visit(v),
    ],

    visitDelegate: (n, v) => [
      ...n.parameterTypes.map(it => it.visit(v)),
      n.returnType.visit(v),
    ],
    visitDelegateCall: (n, v) => [
      n.target.visit(v),
      n.delegateRef.visit(v),
      n.args.visit(v),
    ],
    visitGenericRef: () => noop,

    visitMemberAccess: (n, v) => [
      n.owner.visit(v),
      n.member.visit(v),
    ],

    ...partial,
  };
};


