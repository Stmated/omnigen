
export interface TargetFeatures {

  /**
   * If true, then literal types are supported. A literal type of String is for example "Hello".
   * In for example TypeScript, you can say a function can return either "A" or "B" but not a general string.
   */
  literalTypes: boolean;

  /**
   * If true, then primitives can be used as generics for objects. Such as List<int>
   */
  primitiveGenerics: boolean;
}

/**
 * Be careful when using this; you should always prefer using a more specific target's features.
 * If you can delay a resolution for whatever the features are needed for, then that is always better.
 */
export const OMNI_GENERIC_FEATURES: TargetFeatures = {
  literalTypes: true,
  primitiveGenerics: true,
};
