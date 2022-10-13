import {IOmniModel, RealOptions, AbstractAstTransformer, IExternalSyntaxTree} from '@omnigen/core';
import {IJavaOptions} from '../options';
import {JavaVisitor} from '../visit';
import * as Java from '../ast';

export abstract class AbstractJavaAstTransformer implements AbstractAstTransformer<Java.JavaAstRootNode, IJavaOptions> {

  protected static readonly JAVA_VISITOR: JavaVisitor<void> = new JavaVisitor<void>();

  abstract transformAst(
    model: IOmniModel,
    root: Java.JavaAstRootNode,
    externals: IExternalSyntaxTree<Java.JavaAstRootNode, IJavaOptions>[],
    options: RealOptions<IJavaOptions>
  ): Promise<void>;
}
