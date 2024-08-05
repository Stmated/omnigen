import {AstNode, RootAstNode} from '@omnigen/api';
import {ImplementationArgs} from './ImplementationArgs';
import {ImplementationOptions} from './ImplementationOptions';
import {JavaAndTargetOptions} from '@omnigen/target-java';

export interface ImplementationGenerator<
  TRootNode extends RootAstNode,
  TTargetOpt extends JavaAndTargetOptions,
  TImplOpt extends ImplementationOptions
> {

  generate(args: ImplementationArgs<TRootNode, TTargetOpt, TImplOpt>): Promise<AstNode[]>;
}
