import {JavaCstRootNode, JavaOptions, JavaVisitor} from '@java';
import {OmniModel} from '@parse';
import {AbstractCstTransformer} from '@transform';

export abstract class AbstractJavaCstTransformer implements AbstractCstTransformer<JavaCstRootNode, JavaOptions> {

  protected readonly _javaVisitor = new JavaVisitor<void>();

  abstract transformCst(model: OmniModel, root: JavaCstRootNode, options: JavaOptions): Promise<void>;
}
