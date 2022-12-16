import {AbstractInterpreter, AstRootNode} from '@omnigen/core';
import {FieldAccessorMode, JavaOptions} from '../options/index.js';
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
  AddSubTypeHintsAstTransformer, SimplifyGenericsAstTransformer,
} from '../transform/index.js';
import * as Java from '../ast/index.js';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export class JavaInterpreter extends AbstractInterpreter<JavaOptions> {
  constructor(options: JavaOptions) {
    super();
    this.registerTransformer(new BaseJavaAstTransformer());
    this.registerTransformer(new AddFieldsAstTransformer());
    this.registerTransformer(new PropertyNameDiscrepancyAstTransformer());
    switch (options.fieldAccessorMode) {
      case FieldAccessorMode.POJO:
        this.registerTransformer(new AddAccessorsForFieldsAstTransformer());
        break;
      case FieldAccessorMode.LOMBOK:
        this.registerTransformer(new AddLombokAstTransformer());
        break;
      case FieldAccessorMode.NONE:
        logger.info(`Will not generate any getters or setters for fields`);
        break;
      default:
        throw new Error(`Do not know how to handle field accessor mode ${options.fieldAccessorMode}`);
    }

    // Is possible abstract accessors might clash with the Lombok accessors, will need future revisions
    this.registerTransformer(new AddAbstractAccessorsAstTransformer());
    this.registerTransformer(new AddConstructorJavaAstTransformer());
    this.registerTransformer(new AddAdditionalPropertiesInterfaceAstTransformer());
    this.registerTransformer(new AddCommentsAstTransformer());
    this.registerTransformer(new AddJakartaValidationAstTransformer());
    this.registerTransformer(new AddGeneratedAnnotationAstTransformer());
    this.registerTransformer(new AddSubTypeHintsAstTransformer());
    this.registerTransformer(new InnerTypeCompressionAstTransformer());
    this.registerTransformer(new AddThrowsForKnownMethodsAstTransformer());
    this.registerTransformer(new SimplifyGenericsAstTransformer())
    this.registerTransformer(new PackageResolverAstTransformer());
    this.registerTransformer(new ReorderMembersTransformer());
  }

  newRootNode(): Promise<AstRootNode> {
    return Promise.resolve(new Java.JavaAstRootNode());
  }
}
