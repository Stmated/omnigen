import {AstTransformer, AstTransformerArguments} from '@omnigen/core';
import {JavaOptions} from '../options/index.js';
import {JavaVisitor} from '../visit/index.js';
import * as Java from '../ast/index.js';
import {JavaAstRootNode} from '../ast/index.js';

export type JavaAstTransformerArgs = AstTransformerArguments<JavaAstRootNode, JavaOptions>;

export abstract class AbstractJavaAstTransformer implements AstTransformer<Java.JavaAstRootNode, JavaOptions> {

  protected static readonly JAVA_VISITOR: JavaVisitor<void> = new JavaVisitor<void>();
  protected static readonly JAVA_STRING_VISITOR: JavaVisitor<string> = new JavaVisitor<string>();
  protected static readonly JAVA_BOOLEAN_VISITOR: JavaVisitor<boolean> = new JavaVisitor<boolean>();

  abstract transformAst(args: JavaAstTransformerArgs): Promise<void>;
}
