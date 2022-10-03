import {AbstractInterpreter} from '@interpret/AbstractInterpreter';
import {JavaCstRootNode, IJavaOptions} from '@java';
import {CstRootNode} from '@cst/CstRootNode';
import {BaseJavaCstTransformer} from '@java/transform';
import {AddConstructorJavaCstTransformer} from '@java/transform/AddConstructorJavaCstTransformer';
import {PackageResolverCstTransformer} from '@java/transform/PackageResolverCstTransformer';
import {AdditionalPropertiesInterfaceTransformer} from '@java/transform/AdditionalPropertiesInterfaceTransformer';
import {InnerTypeCompressionCstTransformer} from '@java/transform/InnerTypeCompressionCstTransformer';

export class JavaInterpreter extends AbstractInterpreter<IJavaOptions> {
  constructor() {
    super();
    this.registerTransformer(new BaseJavaCstTransformer());
    this.registerTransformer(new AddConstructorJavaCstTransformer());
    this.registerTransformer(new AdditionalPropertiesInterfaceTransformer());
    this.registerTransformer(new InnerTypeCompressionCstTransformer());
    this.registerTransformer(new PackageResolverCstTransformer());
  }

  newRootNode(): Promise<CstRootNode> {
    return Promise.resolve(new JavaCstRootNode());
  }
}
