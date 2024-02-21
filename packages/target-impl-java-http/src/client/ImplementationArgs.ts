import {AstNode, OmniModel, TargetOptions} from '@omnigen/core';
import {ImplementationOptions} from './ImplementationOptions.js';

export interface ImplementationArgs<
  TAst extends AstNode,
  TTargetOpt extends TargetOptions,
  TImplOpt extends ImplementationOptions,
> {
  model: OmniModel;
  root: TAst;
  targetOptions: TTargetOpt;
  implOptions: TImplOpt;
}
