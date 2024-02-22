import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {JavaOptions} from '../options/index.ts';
import {JavaVisitor} from '../visit';
import * as Java from '../ast';
import {JavaAstRootNode} from '../ast';

export type JavaAndTargetOptions = JavaOptions & TargetOptions & PackageOptions;
export type JavaAstTransformerArgs = AstTransformerArguments<JavaAstRootNode, JavaAndTargetOptions>;

export abstract class AbstractJavaAstTransformer implements AstTransformer<Java.JavaAstRootNode, JavaAndTargetOptions> {

  protected static readonly JAVA_VISITOR: JavaVisitor<void> = new JavaVisitor<void>();
  protected static readonly JAVA_STRING_VISITOR: JavaVisitor<string> = new JavaVisitor<string>();
  protected static readonly JAVA_BOOLEAN_VISITOR: JavaVisitor<boolean> = new JavaVisitor<boolean>();

  abstract transformAst(args: JavaAstTransformerArgs): void;
}
