import {OmniModel, RealOptions, AbstractAstTransformer, ExternalSyntaxTree} from '@omnigen/core';
import {JavaOptions} from '../options';
import {JavaVisitor} from '../visit';
import * as Java from '../ast';

export abstract class AbstractJavaAstTransformer implements AbstractAstTransformer<Java.JavaAstRootNode, JavaOptions> {

  protected static readonly JAVA_VISITOR: JavaVisitor<void> = new JavaVisitor<void>();
  protected static readonly JAVA_STRING_VISITOR: JavaVisitor<string> = new JavaVisitor<string>();

  abstract transformAst(
    model: OmniModel,
    root: Java.JavaAstRootNode,
    externals: ExternalSyntaxTree<Java.JavaAstRootNode, JavaOptions>[],
    options: RealOptions<JavaOptions>
  ): Promise<void>;
}
