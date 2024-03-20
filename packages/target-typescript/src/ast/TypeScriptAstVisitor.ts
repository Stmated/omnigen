import {AstTransformerArguments} from '@omnigen/core';
import {JavaAndTargetOptions} from '@omnigen/target-java';
import {TsRootNode} from './TsRootNode.ts';
import {TypeScriptOptions} from '../options';

export type TypeScriptAstTransformerArgs = AstTransformerArguments<TsRootNode, TypeScriptOptions & JavaAndTargetOptions>;
