import {OMNI_GENERIC_FEATURES, TargetFeatures} from '@omnigen/core';

export * from './visit/index.js';
export * from './transform/index.js';
export * from './interpret/index.js';
export * from './options/index.js';
export * from './util/index.js';
export * from './render/index.js';
export * from './parse/index.js';
export * as Java from './ast/index.js';

export const JAVA_FEATURES: Readonly<TargetFeatures> = {
  ...OMNI_GENERIC_FEATURES,
  literalTypes: false,
  primitiveGenerics: false,
};
