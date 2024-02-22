import {ToEnum} from '../options/index.ts';

export const CompressTypeLevel = {
  EXACT: 'EXACT',
  FUNCTIONALLY_SAME: 'FUNCTIONALLY_SAME',
} as const;

export type CompressTypeLevel = ToEnum<typeof CompressTypeLevel>;
