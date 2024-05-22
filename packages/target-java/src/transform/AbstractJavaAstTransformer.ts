import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {JavaOptions} from '../options';
import {JavaAstRootNode} from '../ast/JavaAstRootNode';
import * as Java from '../ast/JavaAst';

export type JavaAndTargetOptions = JavaOptions & TargetOptions & PackageOptions;
export type JavaAstTransformerArgs = AstTransformerArguments<JavaAstRootNode, JavaAndTargetOptions>;

export abstract class AbstractJavaAstTransformer implements AstTransformer<Java.JavaAstRootNode, JavaAndTargetOptions> {

  abstract transformAst(args: JavaAstTransformerArgs): void;
}
