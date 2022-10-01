import {JavaCstRootNode, IJavaOptions, JavaVisitor} from '@java';
import {OmniModel} from '@parse';
import {AbstractCstTransformer} from '@transform';
import {RealOptions} from '@options';

export abstract class AbstractJavaCstTransformer implements AbstractCstTransformer<JavaCstRootNode, IJavaOptions> {

  protected readonly _javaVisitor = new JavaVisitor<void>();

  abstract transformCst(model: OmniModel, root: JavaCstRootNode, options: RealOptions<IJavaOptions>): Promise<void>;
}
