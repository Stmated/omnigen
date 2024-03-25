import {ToEnum} from '../options';

/**
 * TODO: Remove this and just move it into the regular OmniTypeKind -- it is not a necessary distinction to move these out
 */
export const OmniPrimitiveKind = {
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

export type OmniPrimitiveKind = ToEnum<typeof OmniPrimitiveKind>;
