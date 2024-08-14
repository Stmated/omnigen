import {AstNode, OmniModel, Options, RenderedCompilationUnit} from '@omnigen/api';

export interface OmnigenResult<TOpt extends Options | undefined> {

  model: OmniModel;

  options: TOpt;

  originRootNode?: AstNode;
  rootNode: AstNode;
  renders: RenderedCompilationUnit[];
}
