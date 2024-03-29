import {AstNode} from '../ast';
import {AstTransformerArguments} from './AstTransformerArguments';
import {TargetOptions} from '../interpret';

export interface AstTransformer<TRoot extends AstNode = AstNode, TOpt extends TargetOptions = TargetOptions> {
  transformAst(args: AstTransformerArguments<TRoot, TOpt>): void;
}
