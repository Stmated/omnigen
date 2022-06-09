/* eslint-disable @typescript-eslint/no-unused-vars */
import {AbstractCstVisitor} from '@visit/AbstractCstVisitor';
import * as Java from '@interpret/../../modules/java/java';

export class JavaCstVisitor extends AbstractCstVisitor {
  visitType(node: Java.Type): void {
    // Edge node
  }

  visitIdentifier(node: Java.Identifier): void {
    // Edge node
  }

  visitToken(node: Java.JavaToken): void {
    // Edge node
  }

  visitAnnotationList(node: Java.AnnotationList): void {
    for (const child of node.children) {
      child.visit(this);
    }
  }

  visitArgumentDeclaration(node: Java.ArgumentDeclaration): void {
    if (node.annotations) {
      node.annotations.visit(this);
    }
    node.type.visit(this);
    node.identifier.visit(this);
  }

  visitArgumentDeclarationList(node: Java.ArgumentDeclarationList): void {
    for (const argumentDeclaration of node.children) {
      argumentDeclaration.visit(this);
    }
  }

  visitBinaryExpression(node: Java.BinaryExpression): void {
    node.left.visit(this);
    node.token.visit(this);
    node.right.visit(this);
  }

  visitModifier(node: Java.Modifier): void {
    // Edge node
  }

  visitField(node: Java.Field): void {
    if (node.comments) {
      node.comments.visit(this);
    }
    if (node.annotations) {
      node.annotations.visit(this);
    }
    if (node.modifiers) {
      node.modifiers.visit(this);
    }
    node.type.visit(this);
    node.identifier.visit(this);
    if (node.initializer) {
      node.initializer.visit(this);
    }
  }

  visitCommentList(node: Java.CommentList): void {
    for (const comment of node.children) {
      comment.visit(this);
    }
  }

  visitComment(node: Java.Comment): void {
    // Edge node
  }

  visitFieldBackedGetter(node: Java.FieldBackedGetter): void {
    this.visitMethodDeclaration(node);
  }

  visitFieldBackedSetter(node: Java.FieldBackedSetter): void {
    this.visitMethodDeclaration(node);
  }

  visitMethodDeclaration(node: Java.AbstractMethodDeclaration): void {
    if (node.comments) {
      node.comments.visit(this);
    }
    if (node.annotations) {
      node.annotations.visit(this);
    }
    if (node.modifiers) {
      node.modifiers.visit(this);
    }
    node.type.visit(this);
    node.name.visit(this);
    if (node.parameters) {
      node.parameters.visit(this);
    }
    if (node.body) {
      node.body.visit(this);
    }
  }

  visitExtendsDeclaration(node: Java.ExtendsDeclaration): void {
    node.type.visit(this);
  }

  visitImplementsDeclaration(node: Java.ImplementsDeclaration): void {
    node.types.visit(this);
  }

  visitTypeList(node: Java.TypeList): void {
    for (const type of node.children) {
      type.visit(this);
    }
  }

  visitLiteral(node: Java.Literal): void {
    // Edge node
  }

  visitIfStatement(node: Java.IfStatement): void {
    node.predicate.visit(this);
    node.body.visit(this);
  }

  visitIfElseStatement(node: Java.IfElseStatement): void {
    for (const ifStatement of node.ifStatements) {
      ifStatement.visit(this);
    }
    if (node.elseBlock) {
      node.elseBlock.visit(this);
    }
  }

  visitImportStatement(node: Java.ImportStatement): void {
    node.type.visit(this);
  }

  visitImportList(node: Java.ImportList): void {
    for (const importStatement of node.children) {
      importStatement.visit(this);
    }
  }

  visitMethodCall(node: Java.MethodCall): void {
    node.target.visit(this);
    node.methodName.visit(this);
    if (node.methodArguments) {
      node.methodArguments.visit(this);
    }
  }

  visitNewStatement(node: Java.NewStatement): void {
    node.type.visit(this);
    node.constructorArguments.visit(this);
  }

  visitArgumentList(node: Java.ArgumentList): void {
    for (const argument of node.children) {
      argument.visit(this);
    }
  }

  visitReturnStatement(node: Java.ReturnStatement): void {
    node.expression.visit(this);
  }

  visitVariableReference(node: Java.VariableReference): void {
    node.variableName.visit(this);
  }

  visitAnnotation(node: Java.Annotation): void {
    node.type.visit(this);
    if (node.pairs) {
      node.pairs.visit(this);
    }
  }

  visitAnnotationKeyValuePairList(node: Java.AnnotationKeyValuePairList): void {
    for (const pair of node.children) {
      pair.visit(this);
    }
  }

  visitAnnotationKeyValuePair(node: Java.AnnotationKeyValuePair): void {
    if (node.key) {
      node.key.visit(this);
    }
    node.value.visit(this);
  }

  visitHardCoded(node: Java.HardCoded): void {
    // Edge node
  }

  visitBlock(node: Java.Block): void {
    if (node.children) {
      for (const child of node.children) {
        child.visit(this);
      }
    }
  }

  visitPackage(node: Java.Package): void {
    // Edge node
  }

  visitPredicate(node: Java.Predicate): void {
    // Edge node
  }

  visitModifierList(node: Java.ModifierList): void {
    for (const modifier of node.modifiers) {
      modifier.visit(this);
    }
  }

  visitFieldGetterSetter(node: Java.FieldGetterSetter): void {
    node.field.visit(this);
    node.getter.visit(this);
    node.setter.visit(this);
  }

  visitCast(node: Java.Cast): void {
    node.expression.visit(this);
    node.toType.visit(this);
  }

  visitObjectDeclaration(node: Java.AbstractObjectDeclaration): void {
    if (node.comments) {
      node.comments.visit(this);
    }
    if (node.annotations) {
      node.annotations.visit(this);
    }
    node.modifiers.visit(this);
    node.name.visit(this);
    if (node.extends) {
      node.extends.visit(this);
    }
    if (node.implements) {
      node.implements.visit(this);
    }
    node.body.visit(this);
  }

  visitClassDeclaration(node: Java.ClassDeclaration): void {
    this.visitObjectDeclaration(node);
  }

  visitInterfaceDeclaration(node: Java.InterfaceDeclaration): void {
    this.visitObjectDeclaration(node);
  }

  visitEnumDeclaration(node: Java.EnumDeclaration): void {
    this.visitObjectDeclaration(node);
  }

  visitFieldReference(node: Java.FieldReference): void {
    // Edge node
  }

  visitAssignExpression(node: Java.AssignExpression): void {
    this.visitBinaryExpression(node);
  }

  visitEnumItem(node: Java.EnumItem): void {
    node.identifier.visit(this);
    node.value.visit(this);
  }
}
