import {AbstractInterpreter, AstRootNode} from '@omnigen/core';
import {JavaOptions} from '../options';
import {
  BaseJavaAstTransformer,
  AddConstructorJavaAstTransformer,
  PackageResolverAstTransformer,
  AdditionalPropertiesInterfaceAstTransformer,
  InnerTypeCompressionAstTransformer,
} from '../transform';
import * as Java from '../ast';
import {AddFieldsAstTransformer} from '../transform/AddFieldsAstTransformer';
import {AddGetterSetterAstTransformer} from '../transform/AddGetterSetterAstTransformer';

export class JavaInterpreter extends AbstractInterpreter<JavaOptions> {
  constructor() {
    super();
    this.registerTransformer(new BaseJavaAstTransformer());
    this.registerTransformer(new AddFieldsAstTransformer());
    this.registerTransformer(new AddGetterSetterAstTransformer()); // TODO: Should be optional
    this.registerTransformer(new AddConstructorJavaAstTransformer());
    this.registerTransformer(new AdditionalPropertiesInterfaceAstTransformer());
    this.registerTransformer(new InnerTypeCompressionAstTransformer());
    this.registerTransformer(new PackageResolverAstTransformer());
  }

  newRootNode(): Promise<AstRootNode> {
    return Promise.resolve(new Java.JavaAstRootNode());
  }
}
