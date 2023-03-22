import {AstNode, TargetOptions} from '@omnigen/core';
import {ImplementationArgs} from './ImplementationArgs';
import {ImplementationOptions} from './ImplementationOptions';

export interface ImplementationGenerator<
  TRootNode extends AstNode,
  TTargetOpt extends TargetOptions,
  TImplOpt extends ImplementationOptions,
> {

  generate(args: ImplementationArgs<TRootNode, TTargetOpt, TImplOpt>): Promise<AstNode[]>;
}
