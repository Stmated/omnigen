import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {AstNode, OmniTypeKind} from '@omnigen/core';
import {AbortVisitingWithResult, VisitorFactoryManager, VisitResultFlattener} from '@omnigen/core-util';
import * as Java from '../ast';
import {AnnotationList, CommentBlock, Identifier, ModifierType} from '../ast';
import {JavaUtil} from '../util';

export class AddAccessorsForFieldsAstTransformer extends AbstractJavaAstTransformer {

  private readonly _skip: Java.Identifier[];

  constructor(skip?: Java.Identifier[]) {
    super();
    this._skip = skip ?? [];
  }

  transformAst(args: JavaAstTransformerArgs): void {

    const owner: { node: Java.AbstractObjectDeclaration | undefined } = {node: undefined};
    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitEnumDeclaration: () => {
      },
      visitInterfaceDeclaration: () => {
      },
      visitMethodDeclaration: () => {
      },

      visitClassDeclaration: (node, visitor) => {

        const foundGetter = this.findGetterMethodForField(node);
        if (foundGetter) {

          // There already exists a getter in the class, so something more specific was already done to it.
          return;
        }

        owner.node = node;
        AbstractJavaAstTransformer.JAVA_VISITOR.visitClassDeclaration(node, visitor);
      },

      visitField: node => {

        if (!owner.node) {
          throw new Error(`Visited a field before we ever encountered a compilation unit`);
        }

        if (this._skip.find(it => it.value == node.identifier.value)) {
          return;
        }

        const body = owner.node.body;

        // Move comments from field over to the getter.
        const commentList: CommentBlock | undefined = node.comments;
        node.comments = undefined;

        // Move annotations from field over to the getter.
        // TODO: This should be an option, to move or not.
        const annotationList: AnnotationList | undefined = (node.annotations)
          ? new AnnotationList(...(node.annotations.children || []))
          : undefined;
        node.annotations = undefined;

        const type = node.type.omniType;

        const getterIdentifier = node.property?.propertyName
          ? new Java.Identifier(JavaUtil.getGetterName(node.property?.propertyName, type))
          : undefined;

        if (type.kind == OmniTypeKind.PRIMITIVE && type.literal) {

          const literalMethod = new Java.MethodDeclaration(
            new Java.MethodDeclarationSignature(
              getterIdentifier ?? new Identifier(JavaUtil.getGetterName(node.identifier.value, type)),
              new Java.RegularType(type), undefined, undefined, annotationList, commentList,
            ),
            new Java.Block(
              new Java.Statement(new Java.ReturnStatement(new Java.Literal(type.value ?? null))),
            ),
          );

          const fieldIndex = body.children.indexOf(node);
          body.children.splice(fieldIndex, 1, literalMethod);

        } else {

          body.children.push(new Java.FieldBackedGetter(node, annotationList, commentList, getterIdentifier));
          if (!node.modifiers.children.find(it => it.type == ModifierType.FINAL)) {
            body.children.push(new Java.FieldBackedSetter(node, undefined, undefined));
          }
        }
      },
    }));
  }

  private findGetterMethodForField(latestBody: AstNode): string | string[] | undefined {


    const visitor = VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_STRING_VISITOR, {

      visitField: () => undefined,
      visitConstructor: () => undefined,
      visitExtendsDeclaration: () => undefined,
      visitTypeList: () => undefined,
      visitFieldBackedSetter: () => undefined,

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
