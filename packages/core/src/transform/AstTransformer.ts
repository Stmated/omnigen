import {AstNode} from '../ast/index.ts';
import {AstTransformerArguments} from './AstTransformerArguments';
import {TargetOptions} from '../interpret/index.ts';

export interface AstTransformer<TRoot extends AstNode = AstNode, TOpt extends TargetOptions = TargetOptions> {
  transformAst(args: AstTransformerArguments<TRoot, TOpt>): void;
}
