import {AstNode} from '../ast';
import {AstTransformerArguments} from './AstTransformerArguments';
import {TargetOptions} from '../interpret';

export interface AstTransformer<TRoot extends AstNode, TOpt extends TargetOptions> {
  transformAst(args: AstTransformerArguments<TRoot, TOpt>): Promise<void>;
}
