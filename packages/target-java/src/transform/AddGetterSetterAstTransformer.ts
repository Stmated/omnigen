import {AbstractJavaAstTransformer} from './AbstractJavaAstTransformer';
import {
  AbortVisitingWithResult, AbstractStNode,
  ExternalSyntaxTree,
  OmniModel,
  RealOptions,
  VisitorFactoryManager,
  VisitResultFlattener,
} from '@omnigen/core';
import * as Java from '../ast';
import {AnnotationList, CommentList, JavaAstRootNode, ModifierType} from '../ast';
import {JavaOptions} from '../options';
import {JavaUtil} from '../util';

export class AddGetterSetterAstTransformer extends AbstractJavaAstTransformer {
  transformAst(
    _model: OmniModel,
    root: JavaAstRootNode,
    _externals: ExternalSyntaxTree<JavaAstRootNode, JavaOptions>[],
    _options: RealOptions<JavaOptions>,
  ): Promise<void> {

    const latestCompilationUnit: { cu: Java.CompilationUnit | undefined } = {cu: undefined};
    root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

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
        const commentList: CommentList | undefined = (node.comments)
          ? new CommentList(...(node.comments.children || []))
          : undefined;
        node.comments = undefined;

        // Move annotations from field over to the getter.
        // TODO: This should be an option, to move or not.
        const getterAnnotationList: AnnotationList | undefined = (node.annotations)
          ? new AnnotationList(...(node.annotations.children || []))
          : undefined;
        node.annotations = undefined;

        const getterIdentifier = node.property?.propertyName
          ? new Java.Identifier(JavaUtil.getGetterName(node.property?.propertyName, node.type.omniType))
          : undefined;

        body.children.push(new Java.FieldBackedGetter(node, getterAnnotationList, commentList, getterIdentifier));
        if (!node.modifiers.children.find(it => it.type == ModifierType.FINAL)) {
          body.children.push(new Java.FieldBackedSetter(node, undefined, undefined));
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
        if (/get[A-Z]*/ug.test(methodName)) {
          throw new AbortVisitingWithResult(methodName);
        }
      },
    });

    return VisitResultFlattener.visitWithResult(visitor, latestBody);
  }
}
