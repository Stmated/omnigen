import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {
  AbortVisitingWithResult,
  AbstractStNode,
  ExternalSyntaxTree,
  OmniModel,
  OmniPrimitiveValueMode,
  OmniTypeKind,
  RealOptions,
  VisitorFactoryManager,
  VisitResultFlattener,
} from '@omnigen/core';
import * as Java from '../ast/index.js';
import {AnnotationList, CommentBlock, Identifier, JavaAstRootNode, ModifierType} from '../ast/index.js';
import {JavaOptions} from '../options/index.js';
import {JavaUtil} from '../util/index.js';

export class AddGetterSetterAstTransformer extends AbstractJavaAstTransformer {
  transformAst(args: JavaAstTransformerArgs): Promise<void> {

    const latestCompilationUnit: { cu: Java.CompilationUnit | undefined } = {cu: undefined};
    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitCompilationUnit: (node, visitor) => {

        if (node.object instanceof Java.EnumDeclaration) {

          // We do not add getters/setters for enums.
          return;
        }

        const foundGetter = this.findGetterMethodForField(node);
        if (foundGetter) {

          // There already exists a getter in the class, so we will assume it has been handled by something earlier.
          return;
        }

        latestCompilationUnit.cu = node;
        AbstractJavaAstTransformer.JAVA_VISITOR.visitCompilationUnit(node, visitor);
      },

      visitField: node => {

        if (!latestCompilationUnit.cu) {
          throw new Error(`Visited a field before we ever encountered a compilation unit`);
        }

        const body = latestCompilationUnit.cu.object.body;

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

        if (type.kind == OmniTypeKind.PRIMITIVE && type.valueMode == OmniPrimitiveValueMode.LITERAL) {

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

    return Promise.resolve();
  }

  private findGetterMethodForField(latestBody: AbstractStNode): string | string[] | undefined {

    const visitor = VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_STRING_VISITOR, {

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
