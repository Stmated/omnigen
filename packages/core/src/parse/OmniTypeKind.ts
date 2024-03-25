import {ToEnum} from '../options';

/**
 * TODO: Move other kinds into here, then rename it to OmniKind
 */
export const OmniTypeKind = {
  PRIMITIVE: 'PRIMITIVE',
  ENUM: 'ENUM',
  OBJECT: 'OBJECT',
  HARDCODED_REFERENCE: 'HARDCODED_REFERENCE',
  /**
   * The type lies in another, outside model.
   * Most likely a model that contains types common to multiple other models.
   */
  EXTERNAL_MODEL_REFERENCE: 'EXTERNAL_MODEL_REFERENCE',
  DICTIONARY: 'DICTIONARY',
  ARRAY: 'ARRAY',
  ARRAY_PROPERTIES_BY_POSITION: 'ARRAY_PROPERTIES_BY_POSITION',
  ARRAY_TYPES_BY_POSITION: 'ARRAY_TYPES_BY_POSITION',
  GENERIC_SOURCE: 'GENERIC_SOURCE',
  GENERIC_TARGET: 'GENERIC_TARGET',
  GENERIC_SOURCE_IDENTIFIER: 'GENERIC_SOURCE_IDENTIFIER',
  GENERIC_TARGET_IDENTIFIER: 'GENERIC_TARGET_IDENTIFIER',
  INTERFACE: 'INTERFACE',
  DECORATING: 'DECORATING',
  /**
   * TODO: Deprecated. Remove. Should be up to the target language to handle the original type as best it can!
   */
  WRAPPED: 'WRAPPED',
  /**
   * Type used when the type is known to be unknown.
   * It is a way of saying "it is an object, but it can be anything"
   */
  UNKNOWN: 'UNKNOWN',

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

export type OmniTypeKind = ToEnum<typeof OmniTypeKind>;
