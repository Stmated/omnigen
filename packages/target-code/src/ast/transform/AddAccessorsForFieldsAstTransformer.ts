import {AstNode, AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/core';
import {AbortVisitingWithResult, OmniUtil, VisitorFactoryManager, VisitResultFlattener} from '@omnigen/core-util';
import {CodeRootAstNode} from '../CodeRootAstNode';
import * as Code from '../CodeAst';
import {CodeOptions} from '../../options/CodeOptions';

/**
 * TODO: Rewrite into using Reducer instead of manipulating the node contents
 */
export class AddAccessorsForFieldsAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {

  private readonly _skip: Code.Identifier[];

  constructor(skip?: Code.Identifier[]) {
    this._skip = skip ?? [];
  }

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    const objectStack: Code.AbstractObjectDeclaration[] = []; // { node: Code.AbstractObjectDeclaration | undefined } = {node: undefined};
    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitEnumDeclaration: () => {
      },
      visitInterfaceDeclaration: () => {
      },
      visitMethodDeclaration: () => {
      },

      visitClassDeclaration: (node, visitor) => {

        const foundGetter = this.hasGetter(args.root, node);
        if (foundGetter) {

          // There already exists a getter in the class, so something more specific was already done to it.
          return;
        }

        try {
          objectStack.push(node);
          defaultVisitor.visitClassDeclaration(node, visitor);
        } finally {
          objectStack.pop();
        }
      },

      visitField: node => {

        if (objectStack.length === 0) {
          throw new Error(`Visited a field before we ever encountered a compilation unit`);
        }

        if (this._skip.find(it => it.value == node.identifier.value)) {
          return;
        }

        const objectDec = objectStack[objectStack.length - 1];
        AddAccessorsForFieldsAstTransformer.addAccessorForField(objectDec.body, node);
      },
    }));
  }

  private static addAccessorForField(body: Code.Block, field: Code.Field) {

    // Move comments from field over to the getter.
    const commentList: Code.Comment | undefined = field.comments;
    field.comments = undefined;

    // Move annotations from field over to the getter.
    // TODO: This should be an option, to move or not.
    const annotationList: Code.AnnotationList | undefined = (field.annotations)
      ? new Code.AnnotationList(...(field.annotations.children || []))
      : undefined;
    field.annotations = undefined;

    const type = field.type.omniType;

    const propertyAccessorName = field.property ? OmniUtil.getPropertyAccessorName(field.property.name) : undefined;
    const getterIdentifier = propertyAccessorName
      ? new Code.GetterIdentifier(new Code.Identifier(propertyAccessorName), type)
      : undefined;

    if (OmniUtil.hasSpecifiedConstantValue(type)) {

      const literalMethod = new Code.MethodDeclaration(
        new Code.MethodDeclarationSignature(
          getterIdentifier ?? new Code.GetterIdentifier(field.identifier, type),
          new Code.EdgeType(type), undefined, undefined, annotationList, commentList,
        ),
        new Code.Block(
          new Code.Statement(new Code.ReturnStatement(new Code.Literal(type.value ?? null))),
        ),
      );

      const fieldIndex = body.children.indexOf(field);
      body.children.splice(fieldIndex, 1, literalMethod);

    } else {

      body.children.push(new Code.FieldBackedGetter(new Code.FieldReference(field), annotationList, commentList, getterIdentifier));
      if (!field.modifiers.children.find(it => it.type == Code.ModifierType.FINAL)) {
        body.children.push(new Code.FieldBackedSetter(new Code.FieldReference(field), undefined, undefined));
      }
    }
  }

  private hasGetter(root: CodeRootAstNode, latestBody: AstNode): boolean {

    const defaultVisitor = root.createVisitor<boolean>();

    const visitor = VisitorFactoryManager.create(defaultVisitor, {

      visitField: () => {
      },
      visitConstructor: () => {
      },
      visitExtendsDeclaration: () => {
      },
      visitTypeList: () => {
      },
      visitFieldBackedSetter: () => {
      },

      visitMethodDeclarationSignature: node => {
        if (node.identifier instanceof Code.GetterIdentifier) {
          throw new AbortVisitingWithResult(true);
        } else if (node.identifier instanceof Code.SetterIdentifier) {
          return;
        }

        const methodName = node.identifier.value;
        if ((!node.parameters || node.parameters.children.length == 0) && /(?:get|is)[A-Z]*/ug.test(methodName)) {
          throw new AbortVisitingWithResult(true);
        }
      },
    });

    return VisitResultFlattener.visitWithSingularResult(visitor, latestBody, false);
  }
}
