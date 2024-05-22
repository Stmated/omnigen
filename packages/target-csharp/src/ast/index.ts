import {AstTransformerArguments, TargetOptions} from '@omnigen/core';
import {CSharpRootNode} from './CSharpRootNode.ts';
import {CSharpOptions} from '../options';

export * as Cs from './Cs.ts';
export * from './CSharpRootNode.ts';

export type CSharpAstTransformerArguments = AstTransformerArguments<CSharpRootNode, TargetOptions & CSharpOptions>;
