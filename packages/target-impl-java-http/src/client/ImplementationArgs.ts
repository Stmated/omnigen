import {OmniModel, RootAstNode} from '@omnigen/api';
import {ImplementationOptions} from './ImplementationOptions';
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
