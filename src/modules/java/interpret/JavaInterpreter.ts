import {AbstractInterpreter} from '@interpret/AbstractInterpreter';
import {IJavaOptions} from '@java';
import {AstRootNode} from '@ast';
import {BaseJavaAstTransformer} from '@java/transform';
import {
  AddConstructorJavaAstTransformer,
  PackageResolverAstTransformer,
  AdditionalPropertiesInterfaceAstTransformer,
  InnerTypeCompressionAstTransformer
} from '@java/transform';
import * as Java from '@java/ast';

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
