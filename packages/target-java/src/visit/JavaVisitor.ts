import {AstRootNode, AstVisitor, VisitFn, VisitResult, AbstractStNode} from '@omnigen/core';
import * as Java from '../ast/index.js';

export type JavaVisitFn<in N extends AbstractStNode, R> = VisitFn<N, R, JavaVisitor<R>>;

export class JavaVisitor<R> implements AstVisitor<R> {

  constructor() {

    this.visitorJava = this;

    this.visitRootNode = (node, visitor) => node.children.map(it => it.visit(visitor));
    this.visitRegularType = () => undefined;
    this.visitGenericType = (node, visitor) => {
      return [
        node.baseType.visit(visitor),
        node.genericArguments.map(it => it.visit(visitor)),
      ];
    };
    this.visitIdentifier = () => undefined;
    this.visitToken = () => undefined;
    this.visitAnnotationList = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitArgumentDeclaration = (node, visitor) => {
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
    };

    this.visitArgumentDeclarationList = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitBinaryExpression = (node, visitor) => [
      node.left.visit(visitor),
      node.token.visit(visitor),
      node.right.visit(visitor),
    ];

    this.visitModifier = () => undefined;

    this.visitField = (node, visitor) => {
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
    };

    this.visitCommentBlock = (node, visitor) => {
      return this.visitFreeTextGlobal(node.text, visitor, () => undefined as R);
    };
    this.visitComment = (node, visitor) => {
      return this.visitFreeTextGlobal(node.text, visitor, () => undefined as R);
    };
    this.visitFieldBackedGetter = (node, visitor) => visitor.visitMethodDeclaration(node, visitor);
    this.visitFieldBackedSetter = (node, visitor) => visitor.visitMethodDeclaration(node, visitor);

    this.visitMethodDeclaration = (node, visitor) => {
      if (node.body) {
        return [
          node.signature.visit(visitor),
          node.body.visit(visitor),
        ];
      } else {
        return node.signature.visit(visitor);
      }
    };

    this.visitMethodDeclarationSignature = (node, visitor) => {
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
    };

    this.visitAbstractMethodDeclaration = (node, visitor) => node.signature.visit(visitor);

    this.visitExtendsDeclaration = (node, visitor) => node.type.visit(visitor);
    this.visitImplementsDeclaration = (node, visitor) => node.types.visit(visitor);
    this.visitTypeList = (node, visitor) => node.children.map(it => it.visit(visitor));
    this.visitLiteral = () => undefined;

    this.visitIfStatement = (node, visitor) => [
      node.predicate.visit(visitor),
      node.body.visit(visitor),
    ];

    this.visitIfElseStatement = (node, visitor) =>
      node.ifStatements.map(it => it.visit(visitor))
        .concat(node.elseBlock?.visit(visitor));

    this.visitImportStatement = (node, visitor) => node.type.visit(visitor);

    this.visitImportList = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitMethodCall = (node, visitor) => [
      node.target.visit(visitor),
      node.methodName.visit(visitor),
      node.methodArguments?.visit(visitor),
    ];

    this.visitNewStatement = (node, visitor) => [
      node.type.visit(visitor),
      node.constructorArguments?.visit(visitor),
    ];

    this.visitThrowStatement = (node, visitor) => [
      node.expression.visit(visitor),
    ];

    this.visitArgumentList = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitReturnStatement = (node, visitor) => node.expression.visit(visitor);

    this.visitVariableDeclaration = (node, visitor) => {
      return [
        node.type?.visit(visitor),
        node.identifier.visit(visitor),
        node.initializer?.visit(visitor),
      ];
    };

    // NOTE: Maybe not the most correct way of handling it.
    this.visitDeclarationReference = (node, visitor) => node.declaration.identifier.visit(visitor);

    this.visitAnnotation = (node, visitor) => {
      if (node.pairs) {
        return [
          node.type.visit(visitor),
          node.pairs.visit(visitor),
        ];
      } else {
        return node.type.visit(visitor);
      }
    };

    this.visitAnnotationKeyValuePairList = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitAnnotationKeyValuePair = (node, visitor) => {
      if (node.key) {
        return [
          node.key.visit(visitor),
          node.value.visit(visitor),
        ];
      } else {
        return node.value.visit(visitor);
      }
    };

    this.visitHardCoded = () => undefined;

    this.visitBlock = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitPackage = () => undefined; // Edge node
    this.visitPredicate = (node, visitor) => visitor.visitBinaryExpression(node, visitor);

    this.visitModifierList = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitFieldGetterSetter = (node, visitor) => [
      node.field.visit(visitor),
      node.getter.visit(visitor),
      node.setter.visit(visitor),
    ];

    this.visitCast = (node, visitor) => [
      node.expression.visit(visitor),
      node.toType.visit(visitor),
    ];

    this.visitObjectDeclaration = (node, visitor) => {
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
    };

    this.visitClassDeclaration = (node, visitor) => visitor.visitObjectDeclaration(node, visitor);
    this.visitGenericClassDeclaration = (node, visitor) => {
      return [
        visitor.visitClassDeclaration(node, visitor),
        visitor.visitGenericTypeDeclarationList(node.typeList, visitor),
      ];
    };
    this.visitGenericTypeDeclarationList = (node, visitor) => node.types.map(it => it.visit(visitor));
    this.visitGenericTypeDeclaration = (node, visitor) => {
      return [
        node.name.visit(visitor),
        node.lowerBounds?.visit(visitor),
        node.upperBounds?.visit(visitor),
      ];
    };
    this.visitGenericTypeUseList = (node, visitor) => node.types.map(it => it.visit(visitor));
    this.visitGenericTypeUse = () => undefined;
    this.visitInterfaceDeclaration = (node, visitor) => visitor.visitObjectDeclaration(node, visitor);
    this.visitEnumDeclaration = (node, visitor) => visitor.visitObjectDeclaration(node, visitor);
    this.visitFieldReference = () => undefined;
    this.visitAssignExpression = (node, visitor) => visitor.visitBinaryExpression(node, visitor);

    this.visitEnumItem = (node, visitor) => [
      node.identifier.visit(visitor),
      node.value.visit(visitor),
    ];

    this.visitEnumItemList = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitCompilationUnit = (node, visitor) => [
      node.packageDeclaration.visit(visitor),
      node.imports.visit(visitor),
      node.object.visit(visitor),
    ];

    this.visitConstructor = (node, visitor) => [
      node.modifiers.visit(visitor),
      node.parameters?.visit(visitor),
      node.comments?.visit(visitor),
      node.annotations?.visit(visitor),
      node.body?.visit(visitor),
    ];

    this.visitAdditionalPropertiesDeclaration = (node, visitor) => node.children.map(it => it.visit(visitor));
    this.visitStatement = (node, visitor) => node.child.visit(visitor);
    this.visitSuperConstructorCall = (node, visitor) => node.parameters.visit(visitor);
    this.visitRuntimeTypeMapping = (node, visitor) => [
      ...node.fields.flatMap(it => it.visit(visitor)),
      ...node.getters.flatMap(it => it.visit(visitor)),
      ...node.methods.flatMap(it => it.visit(visitor)),
    ];

    this.visitClassName = (node, visitor) => node.type.visit(visitor);
    this.visitClassReference = (node, visitor) => node.className.visit(visitor);

    this.visitArrayInitializer = (node, visitor) => node.children.map(it => it.visit(visitor));
    this.visitStaticMemberReference = (node, visitor) => [
      node.target.visit(visitor),
      node.member.visit(visitor),
    ];

    this.visitFreeText = () => {
      return [];
    };
    this.visitFreeTextParagraph = (node, visitor) => {
      return this.visitFreeTextGlobal(node.child, visitor, () => undefined as R);
    };
    this.visitFreeTextLine = (node, visitor) => {
      return this.visitFreeTextGlobal(node.child, visitor, () => undefined as R);
    };
    this.visitFreeTextIndent = (node, visitor) => {
      return this.visitFreeTextGlobal(node.child, visitor, () => undefined as R);
    };
    this.visitFreeTextHeader = (node, visitor) => {
      return this.visitFreeTextGlobal(node.child, visitor, () => undefined as R);
    };
    this.visitFreeTextTypeLink = (node, visitor) => node.type.visit(visitor);
    this.visitFreeTextMethodLink = (node, visitor) => [
      node.type.visit(visitor),
      node.method.visit(visitor),
    ];
    this.visitFreeTextSection = (node, visitor) => [
      node.header.visit(visitor),
      this.visitFreeTextGlobal(node.content, visitor, () => undefined as R),
    ];
    this.visitFreeTextPropertyLink = (node, visitor) => node.type.visit(visitor);

    this.visitSelfReference = () => undefined;

    this.visitFreeTextGlobal = (freeText, visitor, translator) => {
      if (typeof freeText == 'string') {
        return translator(freeText);
      } else {
        if (Array.isArray(freeText)) {
          return freeText.map(it => this.visitFreeTextGlobal(it, visitor, translator));
        } else {
          return freeText.visit(visitor);
        }
      }
    };
  }

  visitFreeTextGlobal: {(freeText: Java.FreeTextType, visitor: JavaVisitor<R>, translator: {(v: string): R}): VisitResult<R>};

  visitorJava: JavaVisitor<R>;
  visitRootNode: VisitFn<AstRootNode, R, AstVisitor<R>>;
  visitRegularType: JavaVisitFn<Java.RegularType, R>;
  visitGenericType: JavaVisitFn<Java.GenericType, R>;
  visitIdentifier: JavaVisitFn<Java.Identifier, R>;
  visitToken: JavaVisitFn<Java.JavaToken, R>;
  visitAnnotationList: JavaVisitFn<Java.AnnotationList, R>;
  visitArgumentDeclaration: JavaVisitFn<Java.ArgumentDeclaration, R>;
  visitArgumentDeclarationList: JavaVisitFn<Java.ArgumentDeclarationList, R>;
  visitBinaryExpression: JavaVisitFn<Java.BinaryExpression, R>;
  visitModifier: JavaVisitFn<Java.Modifier, R>;
  visitField: JavaVisitFn<Java.Field, R>;
  visitCommentBlock: JavaVisitFn<Java.CommentBlock, R>;
  visitComment: JavaVisitFn<Java.Comment, R>;
  visitFreeText: JavaVisitFn<Java.FreeText, R>;
  visitFreeTextParagraph: JavaVisitFn<Java.FreeTextParagraph, R>;
  visitFreeTextSection: JavaVisitFn<Java.FreeTextSection, R>;
  visitFreeTextLine: JavaVisitFn<Java.FreeTextLine, R>;
  visitFreeTextIndent: JavaVisitFn<Java.FreeTextIndent, R>;
  visitFreeTextHeader: JavaVisitFn<Java.FreeTextHeader, R>;
  visitFreeTextTypeLink: JavaVisitFn<Java.FreeTextTypeLink, R>;
  visitFreeTextMethodLink: JavaVisitFn<Java.FreeTextMethodLink, R>;
  visitFreeTextPropertyLink: JavaVisitFn<Java.FreeTextPropertyLink, R>;
  // visitFreeTextList: JavaVisitFn<Java.FreeTextList, R>;
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
  visitGenericTypeUseList: JavaVisitFn<Java.GenericTypeUseList, R>;
  visitGenericTypeUse: JavaVisitFn<Java.GenericTypeUse, R>;
  visitInterfaceDeclaration: JavaVisitFn<Java.InterfaceDeclaration, R>;
  visitEnumDeclaration: JavaVisitFn<Java.EnumDeclaration, R>;
  visitEnumItem: JavaVisitFn<Java.EnumItem, R>;
  visitEnumItemList: JavaVisitFn<Java.EnumItemList, R>;
  visitFieldReference: JavaVisitFn<Java.FieldReference, R>;
  visitAssignExpression: JavaVisitFn<Java.AssignExpression, R>;
  visitCompilationUnit: JavaVisitFn<Java.CompilationUnit, R>;
  visitConstructor: JavaVisitFn<Java.ConstructorDeclaration, R>;
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
