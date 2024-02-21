import {getEnumValues, ToEnum, UnknownKind, ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';

export const FieldAccessorMode = {
  NONE: 'NONE',
  POJO: 'POJO',
  LOMBOK: 'LOMBOK',
} as const;
export type FieldAccessorMode = ToEnum<typeof FieldAccessorMode>;

export const ZodJavaOptions = ZodOptions.extend({
  immutableModels: ZodCoercedBoolean.default('true'),
  includeAlwaysNullProperties: ZodCoercedBoolean.default('false'),
  unknownType: z.enum(getEnumValues(UnknownKind)).default(UnknownKind.MUTABLE_OBJECT),
  includeLinksOnType: ZodCoercedBoolean.default('false'),
  includeLinksOnProperty: ZodCoercedBoolean.default('true'),
  interfaceNamePrefix: z.string().default('I'),
  interfaceNameSuffix: z.string().default(''),
  fieldAccessorMode: z.enum(getEnumValues(FieldAccessorMode)).default(FieldAccessorMode.POJO),
  commentsOnTypes: ZodCoercedBoolean.default('true'),
  commentsOnFields: ZodCoercedBoolean.default('false'),
  commentsOnGetters: ZodCoercedBoolean.default('true'),
  commentsOnConstructors: ZodCoercedBoolean.default('true'),
  preferVar: ZodCoercedBoolean.default('true'),
  includeGeneratedAnnotation: ZodCoercedBoolean.default('true'),
});

export type IncomingJavaOptions = z.input<typeof ZodJavaOptions>;
export type JavaOptions = z.infer<typeof ZodJavaOptions>;

export const DEFAULT_JAVA_OPTIONS: Readonly<JavaOptions> = ZodJavaOptions.parse({});
