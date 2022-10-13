import {AbstractInterpreter, AstRootNode} from '@omnigen/core';
import {IJavaOptions} from '../options';
import {
  BaseJavaAstTransformer,
  AddConstructorJavaAstTransformer,
  PackageResolverAstTransformer,
  AdditionalPropertiesInterfaceAstTransformer,
  InnerTypeCompressionAstTransformer,
} from '../transform';
import * as Java from '../ast';

export class JavaInterpreter extends AbstractInterpreter<IJavaOptions> {
  constructor() {
    super();
    this.registerTransformer(new BaseJavaAstTransformer());
    this.registerTransformer(new AddConstructorJavaAstTransformer());
    this.registerTransformer(new AdditionalPropertiesInterfaceAstTransformer());
    this.registerTransformer(new InnerTypeCompressionAstTransformer());
    this.registerTransformer(new PackageResolverAstTransformer());
  }

  newRootNode(): Promise<AstRootNode> {
    return Promise.resolve(new Java.JavaAstRootNode());
  }
}
