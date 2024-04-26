export enum StaticInnerTypeKind {
  DEFAULT_STATIC,
  DEFAULT_PARENT_ACCESSIBLE,
}

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

  /**
   * If true, then the language supports inheriting/extending from a primitive, such as having an Integer as a supertype.
   */
  primitiveInheritance: boolean;

  /**
   * If true, it is legal to for example have class declarations inside other class declarations.
   */
  nestedDeclarations: boolean;

  /**
   * If true, imports can be shortened to be relative to the package of another compilation unit.
   */
  relativeImports: boolean;

  /**
   * If true, then all externally used types must be imported.
   * For example in `Java` there is no need for import if classes are in the same package.
   * But in `TypeScript` any type outside of the current file must be imported.
   */
  forcedImports: boolean;

  /**
   * In `Java` the default is that an inner class can access the wrapping class.
   *
   * In `C#` the default is no access (static class).
   */
  staticInnerTypes: StaticInnerTypeKind;
}

/**
 * Be careful when using this; you should always prefer using a more specific target's features.
 * If you can delay a resolution for whatever the features are needed for, then that is always better.
 */
export const OMNI_GENERIC_FEATURES: TargetFeatures = {
  literalTypes: true,
  primitiveGenerics: true,
  primitiveInheritance: true,
  nestedDeclarations: true,
  relativeImports: true,
  forcedImports: false,
  staticInnerTypes: StaticInnerTypeKind.DEFAULT_PARENT_ACCESSIBLE,
};
