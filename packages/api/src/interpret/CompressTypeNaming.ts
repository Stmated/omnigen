import {ToEnum} from '../options';

export const CompressTypeNaming = {
  EXACT: 'EXACT',
  /**
   * Not implemented
   */
  FIRST: 'FIRST',
  /**
   * Not implemented
   */
  JOIN: 'JOIN',
  COMMON_PREFIX: 'COMMON_PREFIX',
  /**
   * Not implemented
   */
  COMMON_SUFFIX: 'COMMON_SUFFIX',
  /**
   * Not implemented
   */
  COMMON_PREFIX_AND_SUFFIX: 'COMMON_PREFIX_AND_SUFFIX',
} as const;

export type CompressTypeNaming = ToEnum<typeof CompressTypeNaming>;
