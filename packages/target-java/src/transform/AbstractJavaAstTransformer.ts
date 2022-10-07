import {OmniModel, RealOptions, AbstractAstTransformer, ExternalSyntaxTree} from '@omnigen/core';
import {IJavaOptions} from '../options';
import {JavaVisitor} from '../visit';
import * as Java from '../ast';

export abstract class AbstractJavaAstTransformer implements AbstractAstTransformer<Java.JavaAstRootNode, IJavaOptions> {

  protected static readonly _javaVisitor: JavaVisitor<void> = new JavaVisitor<void>();

  abstract transformAst(
    model: OmniModel,
    root: Java.JavaAstRootNode,
    externals: ExternalSyntaxTree<Java.JavaAstRootNode, IJavaOptions>[],
    options: RealOptions<IJavaOptions>
  ): Promise<void>;
}
