import {AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/api';
import {TsRootNode} from './TsRootNode.ts';
import {TypeScriptOptions} from '../options';

export type TypeScriptAstTransformerArgs = AstTransformerArguments<TsRootNode, PackageOptions & TargetOptions & TypeScriptOptions>;
