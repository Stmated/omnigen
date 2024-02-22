import {AstNode, AstTransformer, TargetOptions} from '@omnigen/core';
import {AbstractInterpreter} from '@omnigen/core-util';
import {FieldAccessorMode, JavaOptions} from '../options/index.ts';
import {
  AddConstructorJavaAstTransformer,
  AddGeneratedAnnotationAstTransformer,
  AddAdditionalPropertiesInterfaceAstTransformer,
  BaseJavaAstTransformer,
  InnerTypeCompressionAstTransformer,
  PackageResolverAstTransformer,
  AddJakartaValidationAstTransformer,
  PropertyNameDiscrepancyAstTransformer,
  AddFieldsAstTransformer,
  AddAccessorsForFieldsAstTransformer,
  AddLombokAstTransformer,
  AddCommentsAstTransformer,
  ReorderMembersTransformer,
  AddThrowsForKnownMethodsAstTransformer,
  AddAbstractAccessorsAstTransformer,
  AddSubTypeHintsAstTransformer, SimplifyGenericsAstTransformer, JavaAndTargetOptions,
} from '../transform';
import * as Java from '../ast/index.js';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export class JavaInterpreter extends AbstractInterpreter<JavaAndTargetOptions> {

  getTransformers(options: JavaAndTargetOptions): AstTransformer<AstNode, JavaAndTargetOptions>[] {
    const transformers: AstTransformer<AstNode, JavaAndTargetOptions>[] = [];

    transformers.push(new BaseJavaAstTransformer());
    transformers.push(new AddFieldsAstTransformer());
    transformers.push(new PropertyNameDiscrepancyAstTransformer());
    switch (options.fieldAccessorMode) {
      case FieldAccessorMode.POJO:
        transformers.push(new AddAccessorsForFieldsAstTransformer());
        break;
      case FieldAccessorMode.LOMBOK:
        transformers.push(new AddLombokAstTransformer());
        break;
      case FieldAccessorMode.NONE:
        logger.info(`Will not generate any getters or setters for fields`);
        break;
      default:
        throw new Error(`Do not know how to handle field accessor mode ${options.fieldAccessorMode}`);
    }

    // Is possible abstract accessors might clash with the Lombok accessors, will need future revisions
    transformers.push(new AddAbstractAccessorsAstTransformer());
    transformers.push(new AddConstructorJavaAstTransformer());
    transformers.push(new AddAdditionalPropertiesInterfaceAstTransformer());
    transformers.push(new AddCommentsAstTransformer());
    transformers.push(new AddJakartaValidationAstTransformer());
    transformers.push(new AddGeneratedAnnotationAstTransformer());
    transformers.push(new AddSubTypeHintsAstTransformer());
    transformers.push(new InnerTypeCompressionAstTransformer());
    transformers.push(new AddThrowsForKnownMethodsAstTransformer());
    transformers.push(new SimplifyGenericsAstTransformer());
    transformers.push(new PackageResolverAstTransformer());
    transformers.push(new ReorderMembersTransformer());

    return transformers;
  }

  newRootNode(): AstNode {
    return new Java.JavaAstRootNode();
  }
}
