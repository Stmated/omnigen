import {AstNode, AstVisitor, VisitFn, VisitResult} from '@omnigen/core';
import * as Java from '../ast';

export type JavaVisitFn<N extends AstNode, R> = VisitFn<N, R, JavaVisitor<R>>;

export interface AstFreeTextVisitor<R> extends AstVisitor<R> {
  visitFreeText: VisitFn<Java.FreeText, R, AstFreeTextVisitor<R>>;
  visitFreeTextParagraph: VisitFn<Java.FreeTextParagraph, R, AstFreeTextVisitor<R>>;
  visitFreeTextSection: VisitFn<Java.FreeTextSection, R, AstFreeTextVisitor<R>>;
  visitFreeTextLine: VisitFn<Java.FreeTextLine, R, AstFreeTextVisitor<R>>;
  visitFreeTextIndent: VisitFn<Java.FreeTextIndent, R, AstFreeTextVisitor<R>>;
  visitFreeTextHeader: VisitFn<Java.FreeTextHeader, R, AstFreeTextVisitor<R>>;
  visitFreeTextTypeLink: VisitFn<Java.FreeTextTypeLink, R, AstFreeTextVisitor<R>>;
  visitFreeTextMethodLink: VisitFn<Java.FreeTextMethodLink, R, AstFreeTextVisitor<R>>;
  visitFreeTextPropertyLink: VisitFn<Java.FreeTextPropertyLink, R, AstFreeTextVisitor<R>>;
  visitFreeTextList: VisitFn<Java.FreeTextList, R, AstFreeTextVisitor<R>>;
  visitFreeTexts: VisitFn<Java.FreeTexts, R, AstFreeTextVisitor<R>>;

  visitFreeTextExample: VisitFn<Java.FreeTextExample, R, AstFreeTextVisitor<R>>;
  visitFreeTextCode: VisitFn<Java.FreeTextCode, R, AstFreeTextVisitor<R>>;
  visitFreeTextSummary: VisitFn<Java.FreeTextSummary, R, AstFreeTextVisitor<R>>;
  visitFreeTextRemark: VisitFn<Java.FreeTextRemark, R, AstFreeTextVisitor<R>>;
}

export const createJavaFreeTextVisitor = <R>(partial?: Partial<AstFreeTextVisitor<R>>, n?: R): AstFreeTextVisitor<R> => {

  return {
    visit: (n, v) => n.visit(v),
    visitFreeTexts: (n, v) => n.children.map(it => it.visit(v)),
    visitFreeText: () => n,
    visitFreeTextParagraph: (n, v) => n.child.visit(v),
    visitFreeTextSection: (n, v) => [
      n.header.visit(v),
      n.content.visit(v),
    ],
    visitFreeTextLine: (n, v) => n.child.visit(v),
    visitFreeTextIndent: (n, v) => n.child.visit(v),
    visitFreeTextHeader: (n, v) => n.child.visit(v),
    visitFreeTextTypeLink: (n, v) => n.type.visit(v),
    visitFreeTextMethodLink: (n, v) => [n.type.visit(v), n.method.visit(v)],
    visitFreeTextPropertyLink: (n, v) => n.type.visit(v),
    visitFreeTextList: (n, v) => n.children.map(it => it.visit(v)),
    visitFreeTextExample: (n, v) => n.content.visit(v),
    visitFreeTextCode: (n, v) => n.content.visit(v),
    visitFreeTextSummary: (n, v) => n.content.visit(v),
    visitFreeTextRemark: (n, v) => n.content.visit(v),
    ...partial,
  };
};

export interface JavaVisitor<R> extends AstVisitor<R>, AstFreeTextVisitor<R> {

  visitEdgeType: JavaVisitFn<Java.EdgeType, R>;
  visitWildcardType: JavaVisitFn<Java.WildcardType, R>;
  visitBoundedType: JavaVisitFn<Java.BoundedType, R>;
  visitArrayType: JavaVisitFn<Java.ArrayType, R>;
  visitGenericType: JavaVisitFn<Java.GenericType, R>;
  visitIdentifier: JavaVisitFn<Java.Identifier, R>;
  visitToken: JavaVisitFn<Java.JavaToken, R>;
  visitAnnotationList: JavaVisitFn<Java.AnnotationList, R>;
  visitParameter: JavaVisitFn<Java.Parameter, R>;
  visitParameterList: JavaVisitFn<Java.ParameterList, R>;
  visitBinaryExpression: JavaVisitFn<Java.BinaryExpression, R>;
  visitModifier: JavaVisitFn<Java.Modifier, R>;
  visitField: JavaVisitFn<Java.Field, R>;
  visitComment: JavaVisitFn<Java.Comment, R>;
  visitFieldBackedGetter: JavaVisitFn<Java.FieldBackedGetter, R>;
  visitFieldBackedSetter: JavaVisitFn<Java.FieldBackedSetter, R>;
  visitMethodDeclaration: JavaVisitFn<Java.MethodDeclaration, R>;
  visitMethodDeclarationSignature: JavaVisitFn<Java.MethodDeclarationSignature, R>;
  visitAbstractMethodDeclaration: JavaVisitFn<Java.AbstractMethodDeclaration, R>;
  visitExtendsDeclaration: JavaVisitFn<Java.ExtendsDeclaration, R>;
  visitImplementsDeclaration: JavaVisitFn<Java.ImplementsDeclaration, R>;
  visitTypeList: JavaVisitFn<Java.TypeList, R>;
  visitLiteral: JavaVisitFn<Java.Literal, R>;
  visitIfStatement: JavaVisitFn<Java.IfStatement, R>;
  visitIfElseStatement: JavaVisitFn<Java.IfElseStatement, R>;
  visitTernaryExpression: JavaVisitFn<Java.TernaryExpression, R>;
  visitImportStatement: JavaVisitFn<Java.ImportStatement, R>;
  visitImportList: JavaVisitFn<Java.ImportList, R>;
  visitMethodCall: JavaVisitFn<Java.MethodCall, R>;
  visitNewStatement: JavaVisitFn<Java.NewStatement, R>;
  visitThrowStatement: JavaVisitFn<Java.ThrowStatement, R>;
  visitArgumentList: JavaVisitFn<Java.ArgumentList, R>;
  visitReturnStatement: JavaVisitFn<Java.ReturnStatement, R>;
  visitVariableDeclaration: JavaVisitFn<Java.VariableDeclaration, R>;
  visitAnnotation: JavaVisitFn<Java.Annotation, R>;
  visitAnnotationKeyValuePairList: JavaVisitFn<Java.AnnotationKeyValuePairList, R>;
  visitAnnotationKeyValuePair: JavaVisitFn<Java.AnnotationKeyValuePair, R>;
  visitHardCoded: JavaVisitFn<Java.HardCoded, R>;
  visitBlock: JavaVisitFn<Java.Block, R>;
  visitPackage: JavaVisitFn<Java.PackageDeclaration, R>;
  visitPredicate: JavaVisitFn<Java.Predicate, R>;
  visitModifierList: JavaVisitFn<Java.ModifierList, R>;
  visitCast: JavaVisitFn<Java.Cast, R>;
  visitObjectDeclaration: JavaVisitFn<Java.AbstractObjectDeclaration, R>;
  visitObjectDeclarationBody: JavaVisitFn<Java.AbstractObjectDeclaration, R>;
  visitClassDeclaration: JavaVisitFn<Java.ClassDeclaration, R>;
  visitGenericTypeDeclarationList: JavaVisitFn<Java.GenericTypeDeclarationList, R>;
  visitGenericTypeDeclaration: JavaVisitFn<Java.GenericTypeDeclaration, R>;
  visitInterfaceDeclaration: JavaVisitFn<Java.InterfaceDeclaration, R>;
  visitEnumDeclaration: JavaVisitFn<Java.EnumDeclaration, R>;
  visitEnumItem: JavaVisitFn<Java.EnumItem, R>;
  visitEnumItemList: JavaVisitFn<Java.EnumItemList, R>;
  visitAssignExpression: JavaVisitFn<Java.AssignExpression, R>;
  visitCompilationUnit: JavaVisitFn<Java.CompilationUnit, R>;
  visitConstructor: JavaVisitFn<Java.ConstructorDeclaration, R>;
  visitConstructorParameterList: JavaVisitFn<Java.ConstructorParameterList, R>;
  visitConstructorParameter: JavaVisitFn<Java.ConstructorParameter, R>;
  visitStatement: JavaVisitFn<Java.Statement, R>;
  visitSuperConstructorCall: JavaVisitFn<Java.SuperConstructorCall, R>;
  visitClassName: JavaVisitFn<Java.ClassName, R>;
  visitClassReference: JavaVisitFn<Java.ClassReference, R>;
  visitArrayInitializer: JavaVisitFn<Java.ArrayInitializer<Java.AbstractJavaNode>, R>;
  visitStaticMemberReference: JavaVisitFn<Java.StaticMemberReference, R>;
  visitSelfReference: JavaVisitFn<Java.SelfReference, R>;
  visitNodes: JavaVisitFn<Java.Nodes, R>;
  visitDecoratingTypeNode: JavaVisitFn<Java.DecoratingTypeNode, R>;

  visitDeclarationReference: JavaVisitFn<Java.DeclarationReference, R>;
  visitFieldReference: JavaVisitFn<Java.FieldReference, R>;

  visitNamespace: JavaVisitFn<Java.Namespace, R>;
  visitNamespaceBlock: JavaVisitFn<Java.NamespaceBlock, R>;

  visitTypeNamespace: JavaVisitFn<Java.TypePath, R>;

  visitDelegate: JavaVisitFn<Java.Delegate, R>;
  visitDelegateCall: JavaVisitFn<Java.DelegateCall, R>;

  visitMemberAccess: JavaVisitFn<Java.MemberAccess, R>;

  visitGenericRef: <C extends AstNode>(n: Java.GenericRef<C>, v: JavaVisitor<R>) => VisitResult<R>;
}

export const createJavaVisitor = <R>(partial?: Partial<JavaVisitor<R>>, noop?: R | undefined): Readonly<JavaVisitor<R>> => {

  if (noop === undefined && DefaultJavaVisitor) {

    return {
      ...(DefaultJavaVisitor as any as JavaVisitor<R>),
      ...(partial || {}),
    };
  }

  return createJavaVisitorInternal<R>(partial, noop);
};

export const createJavaVisitorInternal = <R>(partial?: Partial<JavaVisitor<R>>, noop?: R | undefined): Readonly<JavaVisitor<R>> => {

  return {
    ...createJavaFreeTextVisitor<R>(undefined, noop),
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
    visitToken: () => noop,
    visitAnnotationList: (node, visitor) => node.children.map(it => it.visit(visitor)),
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
    visitIfElseStatement: (node, visitor) => node.ifStatements.map(it => it.visit(visitor)).concat(node.elseBlock?.visit(visitor)),
    visitTernaryExpression: (node, visitor) => [
      node.predicate.visit(visitor),
      node.passing.visit(visitor),
      node.failing.visit(visitor),
    ],
    visitImportStatement: (node, visitor) => node.type.visit(visitor),
    visitImportList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitMethodCall: (node, visitor) => [
      node.target.visit(visitor),
      // node.methodName.visit(visitor),
      node.methodArguments?.visit(visitor),
    ],
    visitNewStatement: (node, visitor) => [
      node.type.visit(visitor),
      node.constructorArguments?.visit(visitor),
    ],
    visitThrowStatement: (node, visitor) => [
      node.expression.visit(visitor),
    ],
    visitArgumentList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitReturnStatement: (node, visitor) => node.expression.visit(visitor),
    visitVariableDeclaration: (node, visitor) => [
      node.type?.visit(visitor),
      node.identifier.visit(visitor),
      node.initializer?.visit(visitor),
    ],
    visitDeclarationReference: () => noop,
    visitAnnotation: (n, v) => n.pairs
      ? [n.type.visit(v), n.pairs.visit(v)]
      : n.type.visit(v),
    visitAnnotationKeyValuePairList: (n, v) => n.children.map(it => it.visit(v)),
    visitAnnotationKeyValuePair: (n, v) => n.key
      ? [n.key.visit(v), n.value.visit(v)]
      : n.value.visit(v),
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
    visitAssignExpression: (n, v) => v.visitBinaryExpression(n, v),
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

export const DefaultJavaVisitor = createJavaVisitorInternal<void>();
export const DefaultStringJavaVisitor = createJavaVisitor<string>();
