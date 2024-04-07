import {OmniModel, RootAstNode} from '@omnigen/core';
import {ImplementationOptions} from './ImplementationOptions.ts';
import {JavaAndTargetOptions} from '@omnigen/target-java';

export interface ImplementationArgs<
  TAst extends RootAstNode,
  TTargetOpt extends JavaAndTargetOptions,
  TImplOpt extends ImplementationOptions
> {
  model: OmniModel;
  root: TAst;
  targetOptions: TTargetOpt;
  implOptions: TImplOpt;
}
