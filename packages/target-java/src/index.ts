import {OMNI_GENERIC_FEATURES, TargetFeatures} from '@omnigen/core';

export * from './visit';
export * from './transform';
export * from './interpret';
export * from './options';
export * from './util';
export * from './render';
export * from './parse';
export * as Java from './ast';
export {init} from './JavaPluginInit';

export const JAVA_FEATURES: Readonly<TargetFeatures> = {
  ...OMNI_GENERIC_FEATURES,
  literalTypes: false,
  primitiveGenerics: false,
};
