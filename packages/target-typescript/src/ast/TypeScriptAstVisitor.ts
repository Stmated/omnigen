import {AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {TsRootNode} from './TsRootNode.ts';
import {TypeScriptOptions} from '../options';

export type TypeScriptAstTransformerArgs = AstTransformerArguments<TsRootNode, PackageOptions & TargetOptions & TypeScriptOptions>;
