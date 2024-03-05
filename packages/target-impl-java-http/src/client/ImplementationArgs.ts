import {AstNode, OmniModel} from '@omnigen/core';
import {ImplementationOptions} from './ImplementationOptions.js';
import {JavaAndTargetOptions} from '@omnigen/target-java';

export interface ImplementationArgs<
  TAst extends AstNode,
  TTargetOpt extends JavaAndTargetOptions,
  TImplOpt extends ImplementationOptions,
> {
  model: OmniModel;
  root: TAst;
  targetOptions: TTargetOpt;
  implOptions: TImplOpt;
}
