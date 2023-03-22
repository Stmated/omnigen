import {Pipeline} from '@omnigen/core';
import {BuilderMethods, PipelineArgs, PipelineBuilder} from './PipelineBuilder.ts';

export type OptionalExcept<T extends object, K extends keyof T> = Omit<Partial<T>, K> & Pick<T, K>;

// TODO: Fix the type of the arguments on "after" -- since we can be sure it is set there
//        Even better would be if we could know of ALL previous steps -- but not sure how? Is it possible to use index?
//          Reference to the "previous step" for the step functions?
export type PipelineCustomizerAfter<A extends Partial<PipelineArgs>, M extends BuilderMethods, B extends PipelineBuilder<A, M>> = {
  [K in keyof B as K extends string ? `after${Capitalize<K>}` : never]?: { (builder: B): void }
};

export type PipelineCustomizer<
  A extends Partial<PipelineArgs> = Partial<PipelineArgs>,
  M extends BuilderMethods = BuilderMethods,
  B extends PipelineBuilder<A, M> = PipelineBuilder<A, M>
> = PipelineCustomizerAfter<A, M, B>;

const c: PipelineCustomizer = {
  afterFrom: builder => {

    builder.withOptions(a => ({})).write(a => {

    });
  },
};

export interface PipelineCustomizer2 {

  entry?: <P extends OptionalExcept<Pipeline, 'run'>>(pipeline: P) => P;
  beforeParse?: <P extends OptionalExcept<Pipeline, 'run' | 'input'>>(pipeline: P) => P;
  afterParse?: <P extends OptionalExcept<Pipeline, 'run' | 'input' | 'parserOptions'>>(pipeline: P) => P;
  beforeRender?: <P extends OptionalExcept<Pipeline, 'run' | 'input' | 'parserOptions' | 'targetOptions'>>(pipeline: P) => P;
}
