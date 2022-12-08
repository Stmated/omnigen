import {AstRootNode, TargetOptions} from '@omnigen/core';
import {ImplementationArgs} from './ImplementationArgs.js';
import {ImplementationOptions} from './ImplementationOptions.js';

export interface ImplementationGenerator<
  TRootNode extends AstRootNode,
  TTargetOpt extends TargetOptions,
  TImplOpt extends ImplementationOptions,
> {

  generate(args: ImplementationArgs<TRootNode, TTargetOpt, TImplOpt>): Promise<AstRootNode[]>;
}
