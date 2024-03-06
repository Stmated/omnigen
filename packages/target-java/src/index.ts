import {TargetFeatures} from '@omnigen/core';

export * from './visit/index.ts';
export * from './transform/index.ts';
export * from './interpret/index.ts';
export * from './options/index.ts';
export * from './util/index.ts';
export * from './render/index.ts';
export * from './parse/index.ts';
export * as Java from './ast/index.ts';
export * as JavaPlugins from './JavaPluginInit.ts';

export const JAVA_FEATURES: TargetFeatures = {
  literalTypes: false,
  primitiveGenerics: false,
  primitiveInheritance: false,
};

