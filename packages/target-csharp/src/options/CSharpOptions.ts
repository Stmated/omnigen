import {getEnumValues, ToEnum, ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';

export const CSharpEnumKind = {
  ENUM: 'ENUM',
  CONST: 'CONST',
  WRAPPED: 'WRAPPED',
} as const;
export type CSharpEnumKind = ToEnum<typeof CSharpEnumKind>;

export const ReadonlyPropertyMode = {
  INIT: 'ENUM',
  NO_SETTER: 'NO_SETTER',
  PRIVATE: 'PRIVATE',
} as const;
export type ReadonlyPropertyMode = ToEnum<typeof ReadonlyPropertyMode>;

export const ZodCSharpOptions = ZodOptions.extend({

  singleFile: ZodCoercedBoolean.default('f'),
  enumKind: z.enum(getEnumValues(CSharpEnumKind)).default('CONST'),
  csharpReadonlyPropertySetterMode: z.enum(getEnumValues(ReadonlyPropertyMode)).default('NO_SETTER'),
});

export type CSharpOptions = z.infer<typeof ZodCSharpOptions>;
