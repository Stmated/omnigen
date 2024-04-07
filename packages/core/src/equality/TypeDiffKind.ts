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
   * This can happen if two types are strings but they are the literal strings of "hello" and "bye".
   */
  NARROWED_LITERAL_TYPE = 'NARROWED_LITERAL_TYPE',
  /**
   * Narrowed type is for example if one is type `string` and the other is constant/enum/literal `"foo"`.
   *
   * Or if one is `T | U` and the other is `T`.
   */
  NARROWED_TYPE = 'NARROWED_TYPE',

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
   */
  NO_GENERIC_OVERLAP = 'NO_GENERIC_OVERLAP',

  /**
   * Difference being that the one type is the supertype of the other. They have common ancestry.
   *
   * This difference could be in a result multiple times, depending on how far related they they.
   */
  IS_SUPERTYPE = 'IS_SUPERTYPE',

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
}
