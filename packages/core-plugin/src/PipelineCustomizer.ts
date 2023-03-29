import {RunOptions} from '@omnigen/core';
import {
  Pipeline,
  PipelineArgs,
  PipeParserOptions,
} from './PipelineBuilder.ts';


type ArgsAfter<K extends keyof PipelineArgs, Specific extends Partial<PipelineArgs> = {}> = Pick<PipelineArgs, K> & Specific;

// TODO: If possible, it would be nice to get the correct types based on the step dynamically instead of this ever being out-of-sync
type ArgsAfterParse = ArgsAfter<'run' | 'input' | 'model', {options: PipeParserOptions}>;

export interface PipelineCustomizer {

  afterRun?(run: RunOptions, pipeline: Pick<Pipeline<Pick<PipelineArgs, 'run'>>, 'from'>): void;

  afterInput?(run: RunOptions, pipeline: Pick<Pipeline<Pick<PipelineArgs, 'run' | 'input'>>, 'deserialize'>): void;

  afterParseOptions?(run: RunOptions, pipeline: Pick<Pipeline<Pick<PipelineArgs, 'run' | 'input' | 'options'>>, 'parse'>): void;

  afterParse?(run: RunOptions, pipeline: Pick<Pipeline<ArgsAfterParse>, 'resolveTransformOptions' | 'resolveTransformOptionsDefault' | 'withTargetOptions'>): void;
}

