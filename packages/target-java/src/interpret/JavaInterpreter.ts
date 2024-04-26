import {AstTransformer, RootAstNode} from '@omnigen/core';
import {AbstractInterpreter} from '@omnigen/core-util';
import {FieldAccessorMode} from '../options';
import {
  AddAbstractAccessorsAstTransformer,
  AddAccessorsForFieldsAstTransformer,
  AddAdditionalPropertiesInterfaceAstTransformer,
  AddCommentsAstTransformer,
  AddCompositionMembersJavaAstTransformer,
  AddConstructorJavaAstTransformer,
  AddFieldsAstTransformer,
  AddGeneratedAnnotationJavaAstTransformer,
  AddJakartaValidationAstTransformer,
  AddLombokAstTransformer,
  AddObjectDeclarationsJavaAstTransformer,
  AddSubTypeHintsAstTransformer,
  AddThrowsForKnownMethodsAstTransformer,
  DelegatesToJavaAstTransformer,
  FlattenSuperfluousNodesAstTransformer,
  GenericNodesToSpecificJavaAstTransformer,
  InnerTypeCompressionAstTransformer,
  JacksonJavaAstTransformer,
  JavaAndTargetOptions,
  PackageResolverAstTransformer,
  PatternPropertiesToMapJavaAstTransformer,
  RemoveConstantParametersAstTransformer,
  ReorderMembersAstTransformer,
  ResolveGenericSourceIdentifiersAstTransformer,
  SimplifyGenericsAstTransformer, ToConstructorBodySuperCallAstTransformer,
  ToHardCodedTypeJavaAstTransformer,
} from '../transform';
import * as Java from '../ast';
import {LoggerFactory} from '@omnigen/core-log';
import {GroupExampleTextsToSectionAstTransformer} from '../transform/GroupExampleTextsToSectionAstTransformer.ts';
import {ToJavaAstTransformer} from '../transform/ToJavaAstTransformer.ts';

const logger = LoggerFactory.create(import.meta.url);

export class JavaInterpreter extends AbstractInterpreter<JavaAndTargetOptions> {

  * getTransformers(options: JavaAndTargetOptions): Generator<AstTransformer<RootAstNode, JavaAndTargetOptions>> {

    yield new AddObjectDeclarationsJavaAstTransformer();

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

    yield new AddCompositionMembersJavaAstTransformer();

    yield new AddAbstractAccessorsAstTransformer();
    yield new AddConstructorJavaAstTransformer(); // Move to much later, so things like generic normalization/simplification has been done?
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
    yield new FlattenSuperfluousNodesAstTransformer();
    yield new ReorderMembersAstTransformer();
  }

  newRootNode(): RootAstNode {
    return new Java.JavaAstRootNode();
  }
}
