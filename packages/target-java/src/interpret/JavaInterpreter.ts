import {AbstractInterpreter, AstRootNode} from '@omnigen/core';
import {FieldAccessorMode, JavaOptions} from '../options/index.js';
import {
  AddConstructorJavaAstTransformer,
  AdditionalPropertiesInterfaceAstTransformer,
  BaseJavaAstTransformer,
  InnerTypeCompressionAstTransformer,
  PackageResolverAstTransformer,
} from '../transform/index.js';
import * as Java from '../ast/index.js';
import {AddFieldsAstTransformer} from '../transform/AddFieldsAstTransformer.js';
import {AddGetterSetterAstTransformer} from '../transform/AddGetterSetterAstTransformer.js';
import {AddLombokAstTransformer} from '../transform/AddLombokAstTransformer.js';
import {LoggerFactory} from '@omnigen/core-log';
import {PropertyNameDiscrepancyAstTransformer} from '../transform/PropertyNameDiscrepancyAstTransformer.js';

const logger = LoggerFactory.create(import.meta.url);

export class JavaInterpreter extends AbstractInterpreter<JavaOptions> {
  constructor(options: JavaOptions) {
    super();
    this.registerTransformer(new BaseJavaAstTransformer());
    this.registerTransformer(new AddFieldsAstTransformer());
    this.registerTransformer(new PropertyNameDiscrepancyAstTransformer());
    switch (options.fieldAccessorMode) {
      case FieldAccessorMode.POJO:
        this.registerTransformer(new AddGetterSetterAstTransformer());
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
    this.registerTransformer(new AddConstructorJavaAstTransformer());
    this.registerTransformer(new AdditionalPropertiesInterfaceAstTransformer());
    this.registerTransformer(new InnerTypeCompressionAstTransformer());
    this.registerTransformer(new PackageResolverAstTransformer());
  }

  newRootNode(): Promise<AstRootNode> {
    return Promise.resolve(new Java.JavaAstRootNode());
  }
}
