import {
  AstRootNode,
  OmniModel,
  ParserOptions,
  RealOptions,
  RenderedCompilationUnit,
  TargetOptions,
} from '@omnigen/core';

export interface OmnigenResult<TParseOpt extends ParserOptions, TTargetOpt extends TargetOptions> {

  model: OmniModel;
  parseOptions: RealOptions<TParseOpt>;
  targetOptions: RealOptions<TTargetOpt>;
  originRootNode?: AstRootNode;
  rootNode: AstRootNode;
  renders: RenderedCompilationUnit[];
}
