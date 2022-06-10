/* eslint-disable @typescript-eslint/no-unused-vars */
import {AbstractCstVisitor} from '@visit/AbstractCstVisitor';
import * as Java from '@java/cst';
import {VisitResult} from '@visit';

export class JavaCstVisitor<R> extends AbstractCstVisitor<R> {
  visitType(node: Java.Type): VisitResult<R> {
    // Edge node
  }

  visitIdentifier(node: Java.Identifier): VisitResult<R> {
    // Edge node
  }

  visitToken(node: Java.JavaToken): VisitResult<R> {
    // Edge node
  }

  visitAnnotationList(node: Java.AnnotationList): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }

  visitArgumentDeclaration(node: Java.ArgumentDeclaration): VisitResult<R> {
    if (node.annotations) {
      return [
        node.annotations.visit(this),
        node.type.visit(this),
        node.identifier.visit(this),
      ];
    } else {
      return [
        node.type.visit(this),
        node.identifier.visit(this),
      ];
    }
  }

  visitArgumentDeclarationList(node: Java.ArgumentDeclarationList): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }

  visitBinaryExpression(node: Java.BinaryExpression): VisitResult<R> {
    return [
      node.left.visit(this),
      node.token.visit(this),
      node.right.visit(this),
    ];
  }

  visitModifier(node: Java.Modifier): VisitResult<R> {
    // Edge node
  }

  visitField(node: Java.Field): VisitResult<R> {
    const results: VisitResult<R>[] = [];
    if (node.comments) {
      results.push(node.comments.visit(this));
    }
    if (node.annotations) {
      results.push(node.annotations.visit(this));
    }
    if (node.modifiers) {
      results.push(node.modifiers.visit(this));
    }
    results.push(node.type.visit(this));
    results.push(node.identifier.visit(this));
    if (node.initializer) {
      results.push(node.initializer.visit(this));
    }

    return results;
  }

  visitCommentList(node: Java.CommentList): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }

  visitComment(node: Java.Comment): VisitResult<R> {
    // Edge node
  }

  visitFieldBackedGetter(node: Java.FieldBackedGetter): VisitResult<R> {
    return this.visitMethodDeclaration(node);
  }

  visitFieldBackedSetter(node: Java.FieldBackedSetter): VisitResult<R> {
    return this.visitMethodDeclaration(node);
  }

  visitMethodDeclaration(node: Java.AbstractMethodDeclaration): VisitResult<R> {
    const results: VisitResult<R>[] = [];
    if (node.comments) {
      results.push(node.comments.visit(this));
    }
    if (node.annotations) {
      results.push(node.annotations.visit(this));
    }
    if (node.modifiers) {
      results.push(node.modifiers.visit(this));
    }
    results.push(node.type.visit(this));
    results.push(node.name.visit(this));
    if (node.parameters) {
      results.push(node.parameters.visit(this));
    }
    if (node.body) {
      results.push(node.body.visit(this));
    }
    return results;
  }

  visitExtendsDeclaration(node: Java.ExtendsDeclaration): VisitResult<R> {
    return node.type.visit(this);
  }

  visitImplementsDeclaration(node: Java.ImplementsDeclaration): VisitResult<R> {
    return node.types.visit(this);
  }

  visitTypeList(node: Java.TypeList): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }

  visitLiteral(node: Java.Literal): VisitResult<R> {
    // Edge node
  }

  visitIfStatement(node: Java.IfStatement): VisitResult<R> {
    return [
      node.predicate.visit(this),
      node.body.visit(this),
    ];
  }

  visitIfElseStatement(node: Java.IfElseStatement): VisitResult<R> {
    return node.ifStatements.map(it => it.visit(this))
      .concat(node.elseBlock?.visit(this));

    // const results: VisitResult<R>[] = [];
    // for (const ifStatement of node.ifStatements) {
    //   results.push(ifStatement.visit(this));
    // }
    // if (node.elseBlock) {
    //   results.push(node.elseBlock.visit(this));
    // }
    // return results;
  }

  visitImportStatement(node: Java.ImportStatement): VisitResult<R> {
    return node.type.visit(this);
  }

  visitImportList(node: Java.ImportList): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }

  visitMethodCall(node: Java.MethodCall): VisitResult<R> {
    if (node.methodArguments) {
      return [
        node.target.visit(this),
        node.methodName.visit(this),
        node.methodArguments.visit(this),
      ];
    } else {
      return [
        node.target.visit(this),
        node.methodName.visit(this),
      ];
    }
  }

  visitNewStatement(node: Java.NewStatement): VisitResult<R> {
    return [
      node.type.visit(this),
      node.constructorArguments.visit(this),
    ];
  }

  visitArgumentList(node: Java.ArgumentList): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }

  visitReturnStatement(node: Java.ReturnStatement): VisitResult<R> {
    return node.expression.visit(this);
  }

  visitVariableReference(node: Java.VariableReference): VisitResult<R> {
    return node.variableName.visit(this);
  }

  visitAnnotation(node: Java.Annotation): VisitResult<R> {
    if (node.pairs) {
      return [
        node.type.visit(this),
        node.pairs.visit(this),
      ]
    } else {
      return node.type.visit(this);
    }
  }

  visitAnnotationKeyValuePairList(node: Java.AnnotationKeyValuePairList): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }

  visitAnnotationKeyValuePair(node: Java.AnnotationKeyValuePair): VisitResult<R> {
    if (node.key) {
      return [
        node.key.visit(this),
        node.value.visit(this),
      ];
    } else {
      return node.value.visit(this);
    }
  }

  visitHardCoded(node: Java.HardCoded): VisitResult<R> {
    // Edge node
  }

  visitBlock(node: Java.Block): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }

  visitPackage(node: Java.PackageDeclaration): VisitResult<R> {
    // Edge node
  }

  visitPredicate(node: Java.Predicate): VisitResult<R> {
    // Edge node
  }

  visitModifierList(node: Java.ModifierList): VisitResult<R> {
    return node.modifiers.map(it => it.visit(this));
  }

  visitFieldGetterSetter(node: Java.FieldGetterSetter): VisitResult<R> {
    return [
      node.field.visit(this),
      node.getter.visit(this),
      node.setter.visit(this),
    ];
  }

  visitCast(node: Java.Cast): VisitResult<R> {
    return [
      node.expression.visit(this),
      node.toType.visit(this),
    ];
  }

  visitObjectDeclaration(node: Java.AbstractObjectDeclaration): VisitResult<R> {
    const result: VisitResult<R>[] = [];
    if (node.comments) {
      result.push(node.comments.visit(this));
    }
    if (node.annotations) {
      result.push(node.annotations.visit(this));
    }
    result.push(node.modifiers.visit(this));
    result.push(node.name.visit(this));
    if (node.extends) {
      result.push(node.extends.visit(this));
    }
    if (node.implements) {
      result.push(node.implements.visit(this));
    }
    result.push(node.body.visit(this));

    return result;
  }

  visitClassDeclaration(node: Java.ClassDeclaration): VisitResult<R> {
    return this.visitObjectDeclaration(node);
  }

  visitInterfaceDeclaration(node: Java.InterfaceDeclaration): VisitResult<R> {
    return this.visitObjectDeclaration(node);
  }

  visitEnumDeclaration(node: Java.EnumDeclaration): VisitResult<R> {
    return this.visitObjectDeclaration(node);
  }

  visitFieldReference(node: Java.FieldReference): VisitResult<R> {
    // Edge node
  }

  visitAssignExpression(node: Java.AssignExpression): VisitResult<R> {
    return this.visitBinaryExpression(node);
  }

  visitEnumItem(node: Java.EnumItem): VisitResult<R> {
    return [
      node.identifier.visit(this),
      node.value.visit(this),
    ];
  }

  visitCompilationUnit(node: Java.CompilationUnit): VisitResult<R> {
    return [
      node.packageDeclaration.visit(this),
      node.imports.visit(this),
      node.object.visit(this),
    ]
  }

  visitConstructor(node: Java.ConstructorDeclaration): VisitResult<R> {
    return [
      node.modifiers.visit(this),
      node.parameters?.visit(this),
      node.comments?.visit(this),
      node.annotations?.visit(this),
      node.body?.visit(this),
    ]
  }

  visitAdditionalPropertiesDeclaration(node: Java.AdditionalPropertiesDeclaration): VisitResult<R> {
    return undefined;
  }
}
