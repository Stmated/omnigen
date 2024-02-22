import {TargetFeatures} from '@omnigen/core';
import {z} from 'zod';

export * from './visit';
export * from './transform';
export * from './interpret';
export * from './options/index.ts';
export * from './util';
export * from './render';
export * from './parse';
export * as Java from './ast';
export * as JavaBoot from './JavaPluginInit';

// export const ZodJavaFeatures = z.object({
//   literalTypes: z.literal(false).default(false),
//   primitiveGenerics: z.literal(false).default(false),
// });

export const JAVA_FEATURES: TargetFeatures = {
  literalTypes: false,
  primitiveGenerics: false,
};

