import {ToEnum} from '../options';

export const OmniKindPrimitive = {
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  INTEGER_SMALL: 'INTEGER_SMALL',
  DECIMAL: 'DECIMAL',
  DOUBLE: 'DOUBLE',
  FLOAT: 'FLOAT',
  LONG: 'LONG',
  STRING: 'STRING',
  CHAR: 'CHAR',
  BOOL: 'BOOL',
  VOID: 'VOID',
  NULL: 'NULL',
  UNDEFINED: 'UNDEFINED',
} as const;
export type OmniKindPrimitive = ToEnum<typeof OmniKindPrimitive>;

export const OmniKindComposition = {
  /**
   * Composition: AND
   */
  INTERSECTION: 'INTERSECTION',
  /**
   * Composition: OR
   */
  UNION: 'UNION',
  /**
   * Composition: XOR
   */
  EXCLUSIVE_UNION: 'EXCLUSIVE_UNION',
  /**
   * Composition: NOT
   */
  NEGATION: 'NEGATION',
} as const;
export type OmniKindComposition = ToEnum<typeof OmniKindComposition>;

export const OmniKindGeneric = {
  GENERIC_SOURCE: 'GENERIC_SOURCE',
  GENERIC_TARGET: 'GENERIC_TARGET',
  // This should be called something containing "Parameter" to make things more clear
  GENERIC_SOURCE_IDENTIFIER: 'GENERIC_SOURCE_IDENTIFIER',
  // This should be called something containing "Argument" to make things more clear
  GENERIC_TARGET_IDENTIFIER: 'GENERIC_TARGET_IDENTIFIER',
} as const;
export type OmniKindGeneric = ToEnum<typeof OmniKindGeneric>;

export const OmniTypeKind = {
  ENUM: 'ENUM',
  OBJECT: 'OBJECT',
  HARDCODED_REFERENCE: 'HARDCODED_REFERENCE',
  /**
   * The type lies in another, outside model.
   * Most likely a model that contains types common to multiple other models.
   *
   * @deprecated Remove -- it should be part of a document store; no document should be a "main document"
   */
  EXTERNAL_MODEL_REFERENCE: 'EXTERNAL_MODEL_REFERENCE',
  DICTIONARY: 'DICTIONARY',
  ARRAY: 'ARRAY',
  ARRAY_PROPERTIES_BY_POSITION: 'ARRAY_PROPERTIES_BY_POSITION',
  TUPLE: 'TUPLE',

  INTERFACE: 'INTERFACE',
  DECORATING: 'DECORATING',
  /**
   * TODO: Deprecated. Remove. Should be up to the target language to handle the original type as best it can!
   */
  // WRAPPED: 'WRAPPED',
  /**
   * Type used when the type is known to be unknown.
   * It is a way of saying "it is an object, but it can be anything"
   */
  UNKNOWN: 'UNKNOWN',

  ...OmniKindGeneric,
  ...OmniKindComposition,
  ...OmniKindPrimitive,

} as const;

export type OmniTypeKind = ToEnum<typeof OmniTypeKind>;
