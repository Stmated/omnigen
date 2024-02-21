import {
  AstNode,
  OmniModel, Options,
  ParserOptions,
  RenderedCompilationUnit,
  TargetOptions,
} from '@omnigen/core';

export interface OmnigenResult<TOpt extends Options | undefined> {

  model: OmniModel;

  // /**
  //  * TODO: Remove -- instead all options should be in a map, since we do not know which ones we will get
  //  */
  // parseOptions: TParseOpt;
  // /**
  //  * TODO: Remove -- instead all options should be in a map, since we do not know which ones we will get
  //  */
  // targetOptions: TTargetOpt;

  options: TOpt;


  originRootNode?: AstNode;
  rootNode: AstNode;
  renders: RenderedCompilationUnit[];
}
