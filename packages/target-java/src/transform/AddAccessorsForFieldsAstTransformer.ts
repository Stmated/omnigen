import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {AstNode, OmniTypeKind, RootAstNode} from '@omnigen/core';
import {AbortVisitingWithResult, OmniUtil, VisitorFactoryManager, VisitResultFlattener} from '@omnigen/core-util';
import * as Java from '../ast';
import {AbstractObjectDeclaration, AnnotationList, CommentBlock, Identifier, JavaAstRootNode, ModifierType} from '../ast';
import {JavaUtil} from '../util';
import {DefaultStringJavaVisitor} from '../visit';

export class AddAccessorsForFieldsAstTransformer extends AbstractJavaAstTransformer {

  private readonly _skip: Java.Identifier[];

  constructor(skip?: Java.Identifier[]) {
    super();
    this._skip = skip ?? [];
  }

  transformAst(args: JavaAstTransformerArgs): void {

    const owner: { node: Java.AbstractObjectDeclaration | undefined } = {node: undefined};
    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitEnumDeclaration: () => {
      },
      visitInterfaceDeclaration: () => {
      },
      visitMethodDeclaration: () => {
      },

      visitClassDeclaration: (node, visitor) => {

        const foundGetter = this.findGetterMethodForField(args.root, node);
        if (foundGetter) {

          // There already exists a getter in the class, so something more specific was already done to it.
          return;
        }

        owner.node = node;
        defaultVisitor.visitClassDeclaration(node, visitor);
      },

      visitField: node => {

        if (!owner.node) {
          throw new Error(`Visited a field before we ever encountered a compilation unit`);
        }

        if (this._skip.find(it => it.value == node.identifier.value)) {
          return;
        }

        AddAccessorsForFieldsAstTransformer.addAccessorForField(owner.node.body, node);
      },
    }));
  }

  private static addAccessorForField(body: Java.Block, field: Java.Field) {

    // Move comments from field over to the getter.
    const commentList: CommentBlock | undefined = field.comments;
    field.comments = undefined;

    // Move annotations from field over to the getter.
    // TODO: This should be an option, to move or not.
    const annotationList: AnnotationList | undefined = (field.annotations)
      ? new AnnotationList(...(field.annotations.children || []))
      : undefined;
    field.annotations = undefined;

    const type = field.type.omniType;

    const propertyAccessorName = field.property ? OmniUtil.getPropertyAccessorName(field.property.name) : undefined;
    const getterIdentifier = propertyAccessorName
      ? new Java.Identifier(JavaUtil.getGetterName(propertyAccessorName, type))
      : undefined;

    if (OmniUtil.hasSpecifiedConstantValue(type)) {

      const literalMethod = new Java.MethodDeclaration(
        new Java.MethodDeclarationSignature(
          getterIdentifier ?? new Identifier(JavaUtil.getGetterName(field.identifier.value, type)),
          new Java.EdgeType(type), undefined, undefined, annotationList, commentList,
        ),
        new Java.Block(
          new Java.Statement(new Java.ReturnStatement(new Java.Literal(type.value ?? null))),
        ),
      );

      const fieldIndex = body.children.indexOf(field);
      body.children.splice(fieldIndex, 1, literalMethod);

    } else {

      body.children.push(new Java.FieldBackedGetter(new Java.FieldReference(field), annotationList, commentList, getterIdentifier));
      if (!field.modifiers.children.find(it => it.type == ModifierType.FINAL)) {
        body.children.push(new Java.FieldBackedSetter(new Java.FieldReference(field), undefined, undefined));
      }
    }
  }

  private findGetterMethodForField(root: JavaAstRootNode, latestBody: AstNode): string | string[] | undefined {

    const defaultVisitor = root.createVisitor<string>();

    const visitor = VisitorFactoryManager.create(defaultVisitor, {

      visitField: () => {},
      visitConstructor: () => {},
      visitExtendsDeclaration: () => {},
      visitTypeList: () => {},
      visitFieldBackedSetter: () => {},

      visitMethodDeclarationSignature: node => {
        const methodName = node.identifier.value;
        if ((!node.parameters || node.parameters.children.length == 0) && /(?:get|is)[A-Z]*/ug.test(methodName)) {
          throw new AbortVisitingWithResult(methodName);
        }
      },
    });

    return VisitResultFlattener.visitWithResult(visitor, latestBody);
  }
}
