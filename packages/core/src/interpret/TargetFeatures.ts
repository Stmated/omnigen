import {z} from 'zod';
import {ZodCoercedBoolean} from '../options';

export const ZodTargetFeatures = z.object({
  /**
   * If true, then literal types are supported. A literal type of String is for example "Hello".
   * In for example TypeScript, you can say a function can return either "A" or "B" but not a general string.
   */
  literalTypes: ZodCoercedBoolean,

  /**
   * If true, then primitives can be used as generics for objects. Such as List<int>
   */
  primitiveGenerics: ZodCoercedBoolean,

  /**
   * If true, then the language supports inheriting/extending from a primitive, such as having an Integer as a supertype.
   */
  primitiveInheritance: ZodCoercedBoolean,
});

export type TargetFeatures = z.output<typeof ZodTargetFeatures>;

/**
 * Be careful when using this; you should always prefer using a more specific target's features.
 * If you can delay a resolution for whatever the features are needed for, then that is always better.
 */
export const OMNI_GENERIC_FEATURES: TargetFeatures = {
  literalTypes: true,
  primitiveGenerics: true,
  primitiveInheritance: true,
};
