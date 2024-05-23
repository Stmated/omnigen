import {AstTransformer, RootAstNode} from '@omnigen/core';
import {AbstractInterpreter} from '@omnigen/core-util';
import {FieldAccessorMode} from '../options';
import {
  AddGeneratedAnnotationJavaAstTransformer,
  AddJakartaValidationAstTransformer,
  AddLombokAstTransformer,
  AddSubTypeHintsAstTransformer,
  AddThrowsForKnownMethodsAstTransformer,
  DelegatesToJavaAstTransformer,
  GenericNodesToSpecificJavaAstTransformer,
  GroupExampleTextsToSectionAstTransformer,
  JacksonJavaAstTransformer,
  JavaAndTargetOptions,
  PatternPropertiesToMapJavaAstTransformer,
  ToHardCodedTypeJavaAstTransformer,
} from '../transform';
import * as Java from '../ast/JavaAst';
import {LoggerFactory} from '@omnigen/core-log';
import {ToJavaAstTransformer} from '../transform/ToJavaAstTransformer';
import {
  AddAbstractAccessorsAstTransformer,
  AddAccessorsForFieldsAstTransformer,
  AddAdditionalPropertiesInterfaceAstTransformer,
  AddCommentsAstTransformer,
  AddCompositionMembersCodeAstTransformer,
  AddConstructorCodeAstTransformer,
  AddFieldsAstTransformer,
  AddObjectDeclarationsCodeAstTransformer,
  InnerTypeCompressionAstTransformer,
  PackageResolverAstTransformer,
  RemoveConstantParametersAstTransformer,
  ReorderMembersAstTransformer,
  ResolveGenericSourceIdentifiersAstTransformer,
  SimplifyGenericsAstTransformer,
  ToConstructorBodySuperCallAstTransformer,
  SimplifyAndCleanAstTransformer,
} from '@omnigen/target-code';
import {JavaAstRootNode} from '../ast/JavaAstRootNode';
import {SimplifyTypePathsJavaAstTransformer} from '../transform/SimplifyTypePathsJavaAstTransformer.ts';

const logger = LoggerFactory.create(import.meta.url);

export class JavaInterpreter extends AbstractInterpreter<JavaAndTargetOptions> {

  * getTransformers(options: JavaAndTargetOptions): Generator<AstTransformer<JavaAstRootNode, JavaAndTargetOptions>> {

    yield new AddObjectDeclarationsCodeAstTransformer();

    yield new AddFieldsAstTransformer();
    switch (options.fieldAccessorMode) {
      case FieldAccessorMode.POJO:
        yield new AddAccessorsForFieldsAstTransformer();
        break;
      case FieldAccessorMode.LOMBOK:
        yield new AddLombokAstTransformer();
        break;
      case FieldAccessorMode.NONE:
        logger.info(`Will not generate any getters or setters for fields`);
        break;
      default:
        throw new Error(`Do not know how to handle field accessor mode ${options.fieldAccessorMode}`);
    }

    yield new AddCompositionMembersCodeAstTransformer();

    yield new AddAbstractAccessorsAstTransformer();

    if (options.fieldAccessorMode !== FieldAccessorMode.LOMBOK) {

      // If the fields are managed by lombok, then we add no constructor.
      // TODO: Move to much later, so things like generic normalization/simplification has been done?
      yield new AddConstructorCodeAstTransformer();
    }

    yield new AddAdditionalPropertiesInterfaceAstTransformer();

    yield new AddJakartaValidationAstTransformer();
    yield new AddSubTypeHintsAstTransformer();
    yield new InnerTypeCompressionAstTransformer();
    yield new AddThrowsForKnownMethodsAstTransformer();
    yield new ResolveGenericSourceIdentifiersAstTransformer();
    yield new SimplifyGenericsAstTransformer();
    yield new GenericNodesToSpecificJavaAstTransformer();
    yield new AddCommentsAstTransformer();
    yield new GroupExampleTextsToSectionAstTransformer();
    yield new PatternPropertiesToMapJavaAstTransformer();
    yield new RemoveConstantParametersAstTransformer();
    yield new JacksonJavaAstTransformer();
    yield new ToHardCodedTypeJavaAstTransformer();
    yield new ToConstructorBodySuperCallAstTransformer();
    yield new ToJavaAstTransformer();
    yield new DelegatesToJavaAstTransformer();
    yield new AddGeneratedAnnotationJavaAstTransformer();
    yield new PackageResolverAstTransformer();
    yield new SimplifyTypePathsJavaAstTransformer();
    yield new SimplifyAndCleanAstTransformer();
    yield new ReorderMembersAstTransformer();
  }

  newRootNode(): RootAstNode {
    return new Java.JavaAstRootNode();
  }
}
