import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {JavaOptions} from '../options';
import {createJavaVisitor, JavaVisitor} from '../visit';
import * as Java from '../ast';
import {JavaAstRootNode} from '../ast';

export type JavaAndTargetOptions = JavaOptions & TargetOptions & PackageOptions;
export type JavaAstTransformerArgs = AstTransformerArguments<JavaAstRootNode, JavaAndTargetOptions>;

export abstract class AbstractJavaAstTransformer implements AstTransformer<Java.JavaAstRootNode, JavaAndTargetOptions> {

  protected static readonly JAVA_VISITOR: JavaVisitor<void> = createJavaVisitor<void>();
  protected static readonly JAVA_STRING_VISITOR: JavaVisitor<string> = createJavaVisitor<string>({});
  protected static readonly JAVA_BOOLEAN_VISITOR: JavaVisitor<boolean> = createJavaVisitor<boolean>();

  abstract transformAst(args: JavaAstTransformerArgs): void;
}
