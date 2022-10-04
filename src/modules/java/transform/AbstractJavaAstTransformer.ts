import {RealOptions} from '@options';
import {OmniModel} from '@parse';
import {AbstractAstTransformer, ExternalSyntaxTree} from '@transform';
import {IJavaOptions, JavaVisitor} from '@java';
import * as Java from '@java/ast';

export abstract class AbstractJavaAstTransformer implements AbstractAstTransformer<Java.JavaAstRootNode, IJavaOptions> {

  protected static readonly _javaVisitor: JavaVisitor<void> = new JavaVisitor<void>();

  abstract transformAst(
    model: OmniModel,
    root: Java.JavaAstRootNode,
    externals: ExternalSyntaxTree<Java.JavaAstRootNode, IJavaOptions>[],
    options: RealOptions<IJavaOptions>
  ): Promise<void>;
}
