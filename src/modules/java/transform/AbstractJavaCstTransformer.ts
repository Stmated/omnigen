import {RealOptions} from '@options';
import {OmniModel} from '@parse';
import {AbstractCstTransformer, ExternalSyntaxTree} from '@transform';
import {IJavaOptions, JavaVisitor} from '@java';
import * as Java from '@java/cst';

export abstract class AbstractJavaCstTransformer implements AbstractCstTransformer<Java.JavaCstRootNode, IJavaOptions> {

  protected static readonly _javaVisitor: JavaVisitor<void> = new JavaVisitor<void>();

  abstract transformCst(
    model: OmniModel,
    root: Java.JavaCstRootNode,
    externals: ExternalSyntaxTree<Java.JavaCstRootNode, IJavaOptions>[],
    options: RealOptions<IJavaOptions>
  ): Promise<void>;
}
