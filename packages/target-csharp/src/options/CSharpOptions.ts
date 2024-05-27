import {getEnumValues, ToEnum, ZodCoercedBoolean} from '@omnigen/core';
import {z, ZodString} from 'zod';
import {ZodCodeOptions} from '@omnigen/target-code';

export const CSharpEnumKind = {
  ENUM: 'ENUM',
  CONST: 'CONST',
  WRAPPED: 'WRAPPED',
} as const;
export type CSharpEnumKind = ToEnum<typeof CSharpEnumKind>;

export const SerializationLibrary = {
  NEWTONSOFT: 'NEWTONSOFT',
  SYSTEM_TEXT_JSON: 'SYSTEM_TEXT_JSON',
  NONE: 'NONE',
} as const;
export type SerializationLibrary = ToEnum<typeof SerializationLibrary>;

export const ReadonlyPropertyMode = {
  INIT: 'INIT',
  NO_SETTER: 'NO_SETTER',
  PRIVATE: 'PRIVATE',
} as const;
export type ReadonlyPropertyMode = ToEnum<typeof ReadonlyPropertyMode>;

export const ZodCSharpOptions = ZodCodeOptions.extend({

  singleFile: ZodCoercedBoolean.default('f'),
  singleFileName: z.string().optional(),
  enumKind: z.enum(getEnumValues(CSharpEnumKind)).default('CONST'),
  csharpReadonlyPropertySetterMode: z.enum(getEnumValues(ReadonlyPropertyMode)).default(ReadonlyPropertyMode.NO_SETTER),
  serializationLibrary: z.enum(getEnumValues(SerializationLibrary)).default(SerializationLibrary.NEWTONSOFT),
});

export type CSharpOptions = z.infer<typeof ZodCSharpOptions>;
