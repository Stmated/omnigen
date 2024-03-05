import {OmniModel} from '../parse/index.ts';
import {AstNode} from '../ast/index.ts';
import {TargetOptions} from '../interpret/index.ts';
import {ExternalSyntaxTree} from '../transform/index.ts';

export interface Interpreter<TOpt extends TargetOptions = TargetOptions> {

  buildSyntaxTree(model: OmniModel, externals: ExternalSyntaxTree<AstNode, TOpt>[]): AstNode;
}

