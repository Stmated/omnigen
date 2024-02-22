import {ToEnum} from '../options';

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
} as const;

export type OmniPrimitiveKind = ToEnum<typeof OmniPrimitiveKind>;
