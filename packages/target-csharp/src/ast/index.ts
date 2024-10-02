import {AstTransformerArguments, TargetOptions} from '@omnigen/api';
import {CSharpRootNode} from './CSharpRootNode';
import {CSharpOptions} from '../options';

export * as Cs from './Cs';
export * from './CSharpRootNode';

export type CSharpAstTransformerArguments = AstTransformerArguments<CSharpRootNode, TargetOptions & CSharpOptions>;
