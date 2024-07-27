export enum TypeDiffKind {

  /**
   * The types are fundamentally different, like `String` and `boolean`.
   */
  FUNDAMENTAL_TYPE = 'FUNDAMENTAL_TYPE',
  /**
   * Isomorphic difference is when the structure stays the same, but the actual type differs. For example `1` and `1.0`.
   */
  ISOMORPHIC_TYPE = 'ISOMORPHIC_TYPE',
  /**
   * Difference being in how the signature will be presented, even though the fundamental types themselves are the same.
   * This can happen if two types are strings but they are the literal strings of `"hello"` and `"bye"`.
   */
  POLYMORPHIC_LITERAL = 'POLYMORPHIC_LITERAL',
  /**
   * Narrowed type, for example if one is type `String` and the other is constant/enum/literal `"foo"`.
   */
  CONCRETE_VS_ABSTRACT = 'CONCRETE_VS_ABSTRACT',
  /**
   * If one is `T | U` and the other is `T`. NOTE: Not yet used.
   */
  NARROWED_UNION = 'NARROWED_UNION',
  /**
   * If one is an enum with items of type `String` and the other is a `String`. Nominal because the "names" are different.
   */
  NOMINAL = 'NOMINAL',

  /**
   * For example `int` to `long`.
   */
  SIZE = 'SIZE',

  /**
   * For example `int` to `float`, or `double` to `decimal`.
   */
  PRECISION = 'PRECISION',

  /**
   * - One generic target 'T' of class 'A' points to a generic parameter 'P' of class 'C',
   * - And another class 'B' also points to generic parameter 'P' with its 'T'.
   *
   * But there is no overlap between generic target from 'A' and 'B'. For example `Foo<string>` and `Foo<double>`.
   *
   * If this diff kind is included in an array of diffs, then it means that all other diffs are related to it.
   * This means the difference is for `string` vs `double` and not related to `Foo`.
   */
  NO_GENERIC_OVERLAP = 'NO_GENERIC_OVERLAP',

  /**
   * Difference being that the one type is the supertype of the other. They have common ancestry.
   *
   * This difference could be in a result multiple times, depending on how far related they they.
   */
  IS_SUPERTYPE = 'IS_SUPERTYPE',

  /**
   * Not used yet.
   *
   * Will be used to differentiate between `IS_SUPERTYPE`
   */
  COMMON_ANCESTRY = 'COMMON_ANCESTRY',

  /**
   * This means the name of the type is different.
   * Might show up as the only difference, or sometimes not at all when more important differences were found.
   */
  NAME = 'NAME',

  /**
   * One type is wrapped, and the other is not. In theory the wrapped and unwrapped should be isomorphic.
   */
  WRAPPED = 'WRAPPED',

  /**
   * They differ in nullability, one might be null and other must not be null.
   */
  NULLABILITY = 'NULLABILITY',

  /**
   * They differ in the members of the two types, for example an Enum with `[1, 2]` vs `[1, 3]` then the baseline will be missing `3`.
   */
  MISSING_MEMBERS = 'MISSING_MEMBERS',
}
