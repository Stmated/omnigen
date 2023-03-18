import {AstNode, AstTransformer, RealOptions, TargetOptions} from '@omnigen/core';

export type AstTransformerCreator<TRoot extends AstNode = AstNode, TOpt extends TargetOptions = TargetOptions>
  = { (opt: RealOptions<TOpt>): AstTransformer<TRoot, TOpt>[] };
