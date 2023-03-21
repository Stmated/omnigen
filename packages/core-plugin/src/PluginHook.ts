import {Pipeline} from '@omnigen/core';

export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type OptionalExcept<T extends object, K extends keyof T> = Omit<Partial<T>, K> & Pick<T, K>;

export interface PluginHook {

  entry?: <P extends OptionalExcept<Pipeline, 'run'>>(pipeline: P) => P;
  beforeParse?: <P extends OptionalExcept<Pipeline, 'run' | 'input'>>(pipeline: P) => P;
  afterParse?: <P extends OptionalExcept<Pipeline, 'run' | 'input' | 'parserOptions'>>(pipeline: P) => P;
  beforeRender?: <P extends OptionalExcept<Pipeline, 'run' | 'input' | 'parserOptions' | 'targetOptions'>>(pipeline: P) => P;
}
