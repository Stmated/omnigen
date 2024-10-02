import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, OmniHardcodedReferenceType, OmniProperty, OmniType, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/api';
import {JavaOptions} from '../options';
import {JavaAstRootNode} from '../ast/JavaAstRootNode';
import {Code} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

const ANNOTATION_VALID: OmniHardcodedReferenceType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['jakarta', 'validation'], edgeName: 'Valid'}};
const ANNOTATION_NOT_NULL: OmniHardcodedReferenceType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['jakarta', 'validation', 'constraints'], edgeName: 'NotNull'}};

/**
 * Adds JSR-303/JSR-349 Bean Validation annotations to entities inside the models.
 */
export class BeanValidationJavaAstTransformer implements AstTransformer<JavaAstRootNode> {

  transformAst(args: AstTransformerArguments<JavaAstRootNode, PackageOptions & TargetOptions & JavaOptions>): void {

    if (!args.options.beanValidation) {
      return;
    }

    const fieldToAnnotations = new Map<number, Code.Annotation[]>();
    const typesWithValidations = new Set<OmniType>();

    const objectStack: Code.AbstractObjectDeclaration[] = [];

    const tempAnnotations: Code.Annotation[] = [];

    const defaultVisitor = args.root.createVisitor();
    args.root.visit({
      ...defaultVisitor,
      visitObjectDeclaration: (n, v) => {
        try {
          objectStack.push(n);
          defaultVisitor.visitObjectDeclaration(n, v);
        } finally {
          objectStack.pop();
        }
      },
      visitField: n => {

        tempAnnotations.length = 0;
        if (this.propertyMustNotBeNull(n.property)) {

          const owner = objectStack[objectStack.length - 1];

          tempAnnotations.push(new Code.Annotation(new Code.EdgeType(ANNOTATION_NOT_NULL)));

          typesWithValidations.add(owner.omniType);
        }

        if (tempAnnotations.length > 0) {
          fieldToAnnotations.set(n.id, [...tempAnnotations]);
        }

        return n;
      },

      visitMethodDeclaration: n => n,
      visitInterfaceDeclaration: n => n,
    });

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceField: n => {

        // First we add any validations that the field itself has.
        const annotations = fieldToAnnotations.get(n.id);
        if (annotations) {

          if (!n.annotations) {
            n.annotations = new Code.AnnotationList();
          }

          n.annotations.children.push(...annotations);
        }

        // Then we check if the class we are pointing to has any validations, then we need to add a `@Valid` annotation to make the check recursive.
        if (this.hasNestedValidations(n, typesWithValidations)) {

          if (!n.annotations) {
            n.annotations = new Code.AnnotationList();
          }

          n.annotations.children.push(new Code.Annotation(new Code.EdgeType(ANNOTATION_VALID)));
        }

        return n;
      },

      reduceMethodDeclaration: n => n,
      reduceInterfaceDeclaration: n => n,
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private propertyMustNotBeNull(property: OmniProperty | undefined) {

    if (property && property.required) {

      if (property.type.nullable === undefined || !property.type.nullable) {
        return true;
      }
    }

    return false;
  }

  // TODO: This needs to also check for any subtype of any used type, to see if they have things that need validation
  //        Otherwise we will not find any of the hidden needs
  //        Perhaps this could be helped with an option where we add @Valid to *all* object type fields!
  //        But it should be possible to find all the (at compile-time) places where a @Valid might be needed!
  // TODO: Implement the above!
  private hasNestedValidations(n: Code.Field, typesWithValidations: Set<OmniType>) {

    const type = n.type.omniType;
    if (type.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {

      if (type.upperBound) {

        if (typesWithValidations.has(type.upperBound)) {
          return true;
        }

        if (type.upperBound.kind === OmniTypeKind.GENERIC_TARGET) {

          if (typesWithValidations.has(type.upperBound.source) || typesWithValidations.has(type.upperBound.source.of)) {
            return true;
          }
        } else if (type.upperBound.kind === OmniTypeKind.OBJECT || type.upperBound.kind === OmniTypeKind.INTERFACE) {
          return true;
        }
      } else {
        // There is no upper bound, it can be anything, hence also possibly validate-able.
        return true;
      }

      if (type.lowerBound && typesWithValidations.has(type.lowerBound)) {
        return true;
      }
    } else if (type.kind === OmniTypeKind.OBJECT || type.kind === OmniTypeKind.INTERFACE) {
      return true;
    }

    return typesWithValidations.has(type);
  }
}
