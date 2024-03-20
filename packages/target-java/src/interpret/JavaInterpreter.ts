import {AstNode, AstTransformer} from '@omnigen/core';
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
  AddSubTypeHintsAstTransformer,
  AddThrowsForKnownMethodsAstTransformer,
  AddObjectDeclarationsJavaAstTransformer,
  InnerTypeCompressionAstTransformer,
  JavaAndTargetOptions,
  PackageResolverAstTransformer,
  ToHardCodedTypeJavaAstTransformer,
  ReorderMembersTransformer,
  SimplifyGenericsAstTransformer, JacksonJavaAstTransformer,
} from '../transform';
import * as Java from '../ast';
import {LoggerFactory} from '@omnigen/core-log';
import {AddMissingDeclarationsForTypesAstTransformer} from '../transform';

const logger = LoggerFactory.create(import.meta.url);

export class JavaInterpreter extends AbstractInterpreter<JavaAndTargetOptions> {

  * getTransformers(options: JavaAndTargetOptions): Generator<AstTransformer<AstNode, JavaAndTargetOptions>> {

    yield new AddObjectDeclarationsJavaAstTransformer();
    yield new AddCompositionMembersJavaAstTransformer();
    yield new AddFieldsAstTransformer();
    yield new AddMissingDeclarationsForTypesAstTransformer();
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

    // Is possible abstract accessors might clash with the Lombok accessors, will need future revisions
    yield new AddAbstractAccessorsAstTransformer();
    yield new AddConstructorJavaAstTransformer();
    yield new AddAdditionalPropertiesInterfaceAstTransformer();
    yield new AddCommentsAstTransformer();
    yield new AddJakartaValidationAstTransformer();
    yield new AddGeneratedAnnotationJavaAstTransformer();
    yield new AddSubTypeHintsAstTransformer();
    yield new InnerTypeCompressionAstTransformer();
    yield new AddThrowsForKnownMethodsAstTransformer();
    yield new SimplifyGenericsAstTransformer();
    yield new JacksonJavaAstTransformer();
    yield new ToHardCodedTypeJavaAstTransformer();
    yield new PackageResolverAstTransformer();
    yield new ReorderMembersTransformer();
  }

  newRootNode(): AstNode {
    return new Java.JavaAstRootNode();
  }
}
