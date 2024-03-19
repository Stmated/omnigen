import {AstNode} from '@omnigen/core';
import {ImplementationArgs} from './ImplementationArgs';
import {ImplementationOptions} from './ImplementationOptions';
import {JavaAndTargetOptions} from '@omnigen/target-java';

export interface ImplementationGenerator<
  TRootNode extends AstNode,
  TTargetOpt extends JavaAndTargetOptions,
  TImplOpt extends ImplementationOptions
> {

  generate(args: ImplementationArgs<TRootNode, TTargetOpt, TImplOpt>): Promise<AstNode[]>;
}
