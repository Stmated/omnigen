import {AstNode, AstVisitor, OmniType, VisitFn, VisitResult} from '@omnigen/core';
import * as Java from '../ast/index.ts';

export type JavaVisitFn<N extends AstNode, R> = VisitFn<N, R, JavaVisitor<R>>;

export interface AstFreeTextVisitor<R> {
  visitFreeTextGlobal: { (freeText: Java.FreeTextType, visitor: JavaVisitor<R>, translator: { (v: string): R | undefined }): VisitResult<R> };
  visitFreeText: JavaVisitFn<Java.FreeText, R>;
  visitFreeTextParagraph: JavaVisitFn<Java.FreeTextParagraph, R>;
  visitFreeTextSection: JavaVisitFn<Java.FreeTextSection, R>;
  visitFreeTextLine: JavaVisitFn<Java.FreeTextLine, R>;
  visitFreeTextIndent: JavaVisitFn<Java.FreeTextIndent, R>;
  visitFreeTextHeader: JavaVisitFn<Java.FreeTextHeader, R>;
  visitFreeTextTypeLink: JavaVisitFn<Java.FreeTextTypeLink, R>;
  visitFreeTextMethodLink: JavaVisitFn<Java.FreeTextMethodLink, R>;
  visitFreeTextPropertyLink: JavaVisitFn<Java.FreeTextPropertyLink, R>;
  visitFreeTextList: JavaVisitFn<Java.FreeTextList, R>;
}

export const createJavaFreeTextVisitor = <R>(partial?: Partial<AstFreeTextVisitor<R>>, noop?: R | undefined): AstFreeTextVisitor<R> => {
  return {
    visitFreeTextGlobal: (freeText, visitor, translator) => {
      if (typeof freeText == 'string') {
        return translator(freeText);
      } else {
        if (Array.isArray(freeText)) {
          return freeText.map(it => visitor.visitFreeTextGlobal(it, visitor, translator));
        } else {
          return freeText.visit(visitor);
        }
      }
    },
    visitFreeText: () => [],
    visitFreeTextParagraph: (node, visitor) => visitor.visitFreeTextGlobal(node.child, visitor, () => noop),
    visitFreeTextSection: (node, visitor) => [
      node.header.visit(visitor),
      visitor.visitFreeTextGlobal(node.content, visitor, () => noop),
    ],
    visitFreeTextLine: (node, visitor) => visitor.visitFreeTextGlobal(node.child, visitor, () => noop),
    visitFreeTextIndent: (node, visitor) => visitor.visitFreeTextGlobal(node.child, visitor, () => noop),
    visitFreeTextHeader: (node, visitor) => visitor.visitFreeTextGlobal(node.child, visitor, () => noop),
    visitFreeTextTypeLink: (node, visitor) => node.type.visit(visitor),
    visitFreeTextMethodLink: (node, visitor) => [node.type.visit(visitor), node.method.visit(visitor)],
    visitFreeTextPropertyLink: (node, visitor) => node.type.visit(visitor),
    visitFreeTextList: (node, visitor) => node.children.map(it => visitor.visitFreeTextGlobal(it, visitor, () => noop)),
    ...partial,
  };
};

export interface JavaVisitor<R> extends AstVisitor<R>, AstFreeTextVisitor<R> {

  visitRegularType: JavaVisitFn<Java.RegularType<OmniType>, R>;
  visitGenericType: JavaVisitFn<Java.GenericType, R>;
  visitIdentifier: JavaVisitFn<Java.Identifier, R>;
  visitToken: JavaVisitFn<Java.JavaToken, R>;
  visitAnnotationList: JavaVisitFn<Java.AnnotationList, R>;
  visitParameter: JavaVisitFn<Java.Parameter, R>;
  visitParameterList: JavaVisitFn<Java.ParameterList, R>;
  visitBinaryExpression: JavaVisitFn<Java.BinaryExpression, R>;
  visitModifier: JavaVisitFn<Java.Modifier, R>;
  visitField: JavaVisitFn<Java.Field, R>;
  visitCommentBlock: JavaVisitFn<Java.CommentBlock, R>;
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
  visitDeclarationReference: JavaVisitFn<Java.DeclarationReference, R>;
  visitAnnotation: JavaVisitFn<Java.Annotation, R>;
  visitAnnotationKeyValuePairList: JavaVisitFn<Java.AnnotationKeyValuePairList, R>;
  visitAnnotationKeyValuePair: JavaVisitFn<Java.AnnotationKeyValuePair, R>;
  visitHardCoded: JavaVisitFn<Java.HardCoded, R>;
  visitBlock: JavaVisitFn<Java.Block, R>;
  visitPackage: JavaVisitFn<Java.PackageDeclaration, R>;
  visitPredicate: JavaVisitFn<Java.Predicate, R>;
  visitModifierList: JavaVisitFn<Java.ModifierList, R>;
  visitFieldGetterSetter: JavaVisitFn<Java.FieldGetterSetter, R>;
  visitCast: JavaVisitFn<Java.Cast, R>;
  visitObjectDeclaration: JavaVisitFn<Java.AbstractObjectDeclaration, R>;
  visitClassDeclaration: JavaVisitFn<Java.ClassDeclaration, R>;
  visitGenericClassDeclaration: JavaVisitFn<Java.GenericClassDeclaration, R>;
  visitGenericTypeDeclarationList: JavaVisitFn<Java.GenericTypeDeclarationList, R>;
  visitGenericTypeDeclaration: JavaVisitFn<Java.GenericTypeDeclaration, R>;
  visitInterfaceDeclaration: JavaVisitFn<Java.InterfaceDeclaration, R>;
  visitEnumDeclaration: JavaVisitFn<Java.EnumDeclaration, R>;
  visitEnumItem: JavaVisitFn<Java.EnumItem, R>;
  visitEnumItemList: JavaVisitFn<Java.EnumItemList, R>;
  visitFieldReference: JavaVisitFn<Java.FieldReference, R>;
  visitAssignExpression: JavaVisitFn<Java.AssignExpression, R>;
  visitCompilationUnit: JavaVisitFn<Java.CompilationUnit, R>;
  visitConstructor: JavaVisitFn<Java.ConstructorDeclaration, R>;
  visitConstructorParameterList: JavaVisitFn<Java.ConstructorParameterList, R>;
  visitConstructorParameter: JavaVisitFn<Java.ConstructorParameter, R>;
  visitAdditionalPropertiesDeclaration: JavaVisitFn<Java.AdditionalPropertiesDeclaration, R>;
  visitStatement: JavaVisitFn<Java.Statement, R>;
  visitSuperConstructorCall: JavaVisitFn<Java.SuperConstructorCall, R>;
  visitRuntimeTypeMapping: JavaVisitFn<Java.RuntimeTypeMapping, R>;
  visitClassName: JavaVisitFn<Java.ClassName, R>;
  visitClassReference: JavaVisitFn<Java.ClassReference, R>;
  visitArrayInitializer: JavaVisitFn<Java.ArrayInitializer<Java.AbstractJavaNode>, R>;
  visitStaticMemberReference: JavaVisitFn<Java.StaticMemberReference, R>;
  visitSelfReference: JavaVisitFn<Java.SelfReference, R>;
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
    visitRootNode: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitRegularType: () => noop,
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
    visitCommentBlock: (node, visitor) => visitor.visitFreeTextGlobal(node.text, visitor, () => noop),
    visitComment: (node, visitor) => visitor.visitFreeTextGlobal(node.text, visitor, () => noop),

    visitFieldBackedGetter: (node, visitor) => visitor.visitMethodDeclaration(node, visitor),
    visitFieldBackedSetter: (node, visitor) => visitor.visitMethodDeclaration(node, visitor),
    visitMethodDeclaration: (node, visitor) => {
      if (node.body) {
        return [
          node.signature.visit(visitor),
          node.body.visit(visitor),
        ];
      } else {
        return node.signature.visit(visitor);
      }
    },
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
    visitExtendsDeclaration: (node, visitor) => node.type.visit(visitor),
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
      node.methodName.visit(visitor),
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
    visitDeclarationReference: (node, visitor) => node.declaration.identifier.visit(visitor),
    visitAnnotation: (node, visitor) => {
      if (node.pairs) {
        return [
          node.type.visit(visitor),
          node.pairs.visit(visitor),
        ];
      } else {
        return node.type.visit(visitor);
      }
    },
    visitAnnotationKeyValuePairList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitAnnotationKeyValuePair: (node, visitor) => {
      if (node.key) {
        return [
          node.key.visit(visitor),
          node.value.visit(visitor),
        ];
      } else {
        return node.value.visit(visitor);
      }
    },
    visitHardCoded: (node, visitor) => noop,
    visitBlock: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitPackage: (node, visitor) => noop,
    visitPredicate: (node, visitor) => visitor.visitBinaryExpression(node, visitor),
    visitModifierList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitFieldGetterSetter: (node, visitor) => [
      node.field.visit(visitor),
      node.getter.visit(visitor),
      node.setter.visit(visitor),
    ],
    visitCast: (node, visitor) => [
      node.expression.visit(visitor),
      node.toType.visit(visitor),
    ],
    visitObjectDeclaration: (node, visitor) => {
      const result: VisitResult<R>[] = [];
      if (node.comments) {
        result.push(node.comments.visit(visitor));
      }
      if (node.annotations) {
        result.push(node.annotations.visit(visitor));
      }
      result.push(node.modifiers.visit(visitor));
      result.push(node.name.visit(visitor));
      if (node.extends) {
        result.push(node.extends.visit(visitor));
      }
      if (node.implements) {
        result.push(node.implements.visit(visitor));
      }
      result.push(node.body.visit(visitor));

      return result;
    },
    visitClassDeclaration: (node, visitor) => visitor.visitObjectDeclaration(node, visitor),
    visitGenericClassDeclaration: (node, visitor) => [
      visitor.visitClassDeclaration(node, visitor),
      visitor.visitGenericTypeDeclarationList(node.typeList, visitor),
    ],
    visitGenericTypeDeclarationList: (node, visitor) => node.types.map(it => it.visit(visitor)),
    visitGenericTypeDeclaration: (node, visitor) => [
      node.name.visit(visitor),
      node.lowerBounds?.visit(visitor),
      node.upperBounds?.visit(visitor),
    ],
    visitInterfaceDeclaration: (node, visitor) => visitor.visitObjectDeclaration(node, visitor),
    visitEnumDeclaration: (node, visitor) => visitor.visitObjectDeclaration(node, visitor),
    visitEnumItem: (node, visitor) => [
      node.comment?.visit(visitor),
      node.identifier.visit(visitor),
      node.value.visit(visitor),
    ],
    visitEnumItemList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitFieldReference: (node, visitor) => noop,
    visitAssignExpression: (node, visitor) => visitor.visitBinaryExpression(node, visitor),
    visitCompilationUnit: (node, visitor) => [
      node.packageDeclaration.visit(visitor),
      node.imports.visit(visitor),
      node.object.visit(visitor),
    ],
    visitConstructor: (node, visitor) => [
      node.modifiers.visit(visitor),
      node.parameters?.visit(visitor),
      node.comments?.visit(visitor),
      node.annotations?.visit(visitor),
      node.body?.visit(visitor),
    ],

    visitConstructorParameterList: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitConstructorParameter: (node, visitor) => visitor.visitParameter(node, visitor),

    visitAdditionalPropertiesDeclaration: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitStatement: (node, visitor) => node.child.visit(visitor),
    visitSuperConstructorCall: (node, visitor) => node.parameters.visit(visitor),
    visitRuntimeTypeMapping: (node, visitor) => [
      ...node.fields.flatMap(it => it.visit(visitor)),
      ...node.getters.flatMap(it => it.visit(visitor)),
      ...node.methods.flatMap(it => it.visit(visitor)),
    ],
    visitClassName: (node, visitor) => node.type.visit(visitor),
    visitClassReference: (node, visitor) => node.className.visit(visitor),
    visitArrayInitializer: (node, visitor) => node.children.map(it => it.visit(visitor)),
    visitStaticMemberReference: (node, visitor) => [node.target.visit(visitor), node.member.visit(visitor)],
    visitSelfReference: () => noop,
    ...partial,
  };
};

export const DefaultJavaVisitor = createJavaVisitorInternal<void>();
