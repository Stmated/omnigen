import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {JavaOptions} from '../options';
import * as Java from '../ast';
import {JavaAstRootNode} from '../ast';

export type JavaAndTargetOptions = JavaOptions & TargetOptions & PackageOptions;
export type JavaAstTransformerArgs = AstTransformerArguments<JavaAstRootNode, JavaAndTargetOptions>;

export abstract class AbstractJavaAstTransformer implements AstTransformer<Java.JavaAstRootNode, JavaAndTargetOptions> {

  abstract transformAst(args: JavaAstTransformerArgs): void;
}
