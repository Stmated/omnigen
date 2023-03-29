import {OmniModel} from '../parse';
import {AstNode} from '../ast';
import {TargetOptions} from '../interpret';
import {ExternalSyntaxTree} from '../transform';

export interface Interpreter<TOpt extends TargetOptions = TargetOptions> {
  buildSyntaxTree(model: OmniModel, externals: ExternalSyntaxTree<AstNode, TOpt>[]): AstNode;
}

