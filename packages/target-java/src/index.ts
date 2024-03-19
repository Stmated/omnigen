import {TargetFeatures} from '@omnigen/core';

export * from './visit';
export * from './transform';
export * from './interpret';
export * from './options';
export * from './util';
export * from './render';
export * from './parse';
export * from './reduce';
export * as Java from './ast';
export * as JavaPlugins from './JavaPluginInit.ts';

export const JAVA_FEATURES: TargetFeatures = {
  literalTypes: false,
  primitiveGenerics: false,
  primitiveInheritance: false,
  nestedDeclarations: true,
};

