import {ICstVisitor, VisitFn, VisitResult} from '@visit';
import {IJavaCstVisitor, JavaVisitFn} from '@java/visit/IJavaCstVisitor';
import * as Java from '@java/cst/types';
import {CstRootNode} from '@cst/CstRootNode';

export class JavaVisitor<R> implements IJavaCstVisitor<R> {

  constructor() {

    this.visitor_java = this;

    this.visitRootNode = (node, visitor) => node.children.map(it => it.visit(visitor));
    this.visitType = (node, visitor) => undefined;
    this.visitIdentifier = (node, visitor) => undefined;
    this.visitToken = (node, visitor) => undefined;
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

    this.visitCommentList = (node, visitor) => node.children.map(it => it.visit(visitor));
    this.visitComment = (node, visitor) => undefined;
    this.visitFieldBackedGetter = (node, visitor) => visitor.visitMethodDeclaration(node, visitor);
    this.visitFieldBackedSetter = (node, visitor) => visitor.visitMethodDeclaration(node, visitor);

    this.visitMethodDeclaration = (node, visitor) => {
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
      results.push(node.name.visit(visitor));
      if (node.parameters) {
        results.push(node.parameters.visit(visitor));
      }
      if (node.body) {
        results.push(node.body.visit(visitor));
      }
      return results;
    };

    this.visitExtendsDeclaration = (node, visitor) => node.type.visit(visitor);
    this.visitImplementsDeclaration = (node, visitor) => node.types.visit(visitor);
    this.visitTypeList = (node, visitor) => node.children.map(it => it.visit(visitor));
    this.visitLiteral = (node, visitor) => undefined;

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

    this.visitArgumentList = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitReturnStatement = (node, visitor) => node.expression.visit(visitor);

    this.visitVariableReference = (node, visitor) => node.variableName.visit(visitor);

    this.visitAnnotation = (node, visitor) => {
      if (node.pairs) {
        return [
          node.type.visit(visitor),
          node.pairs.visit(visitor),
        ]
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

    this.visitHardCoded = (node, visitor) => undefined;

    this.visitBlock = (node, visitor) => node.children.map(it => it.visit(visitor));

    this.visitPackage = (node, visitor) => undefined; // Edge node
    this.visitPredicate = (node, visitor) => undefined; // Edge node
    this.visitModifierList = (node, visitor) => node.modifiers.map(it => it.visit(visitor));

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
    this.visitInterfaceDeclaration = (node, visitor) => visitor.visitObjectDeclaration(node, visitor);
    this.visitEnumDeclaration = (node, visitor) => visitor.visitObjectDeclaration(node, visitor);
    this.visitFieldReference = (node, visitor) => undefined;
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
  }

  visitor_java: IJavaCstVisitor<R>;
  visitRootNode: VisitFn<CstRootNode, R, ICstVisitor<R>>;
  visitType: JavaVisitFn<Java.Type, R>;
  visitIdentifier: JavaVisitFn<Java.Identifier, R>;
  visitToken: JavaVisitFn<Java.JavaToken, R>;
  visitAnnotationList: JavaVisitFn<Java.AnnotationList, R>;
  visitArgumentDeclaration: JavaVisitFn<Java.ArgumentDeclaration, R>;
  visitArgumentDeclarationList: JavaVisitFn<Java.ArgumentDeclarationList, R>;
  visitBinaryExpression: JavaVisitFn<Java.BinaryExpression, R>;
  visitModifier: JavaVisitFn<Java.Modifier, R>;
  visitField: JavaVisitFn<Java.Field, R>;
  visitCommentList: JavaVisitFn<Java.CommentList, R>;
  visitComment: JavaVisitFn<Java.Comment, R>;
  visitFieldBackedGetter: JavaVisitFn<Java.FieldBackedGetter, R>;
  visitFieldBackedSetter: JavaVisitFn<Java.FieldBackedSetter, R>;
  visitMethodDeclaration: JavaVisitFn<Java.AbstractMethodDeclaration, R>;
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
  visitArgumentList: JavaVisitFn<Java.ArgumentList, R>;
  visitReturnStatement: JavaVisitFn<Java.ReturnStatement, R>;
  visitVariableReference: JavaVisitFn<Java.VariableReference, R>;
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
}
