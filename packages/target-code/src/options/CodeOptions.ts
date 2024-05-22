import {getEnumValues, ToEnum, UnknownKind, ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';

export const IncludeExampleCommentsMode = {
  ALWAYS: 'ALWAYS',
  SKIP: 'SKIP',
} as const;
export type IncludeExampleCommentMode = ToEnum<typeof IncludeExampleCommentsMode>;

export const ZodCodeOptions = ZodOptions.extend({
  immutableModels: ZodCoercedBoolean.default('true'),
  preferInferredType: ZodCoercedBoolean.default('true'),
  unknownType: z.enum(getEnumValues(UnknownKind)).default(UnknownKind.ANY),

  includeLinksOnType: ZodCoercedBoolean.default('false'),
  includeLinksOnProperty: ZodCoercedBoolean.default('true'),

  commentsOnTypes: ZodCoercedBoolean.default('true'),
  commentsOnFields: ZodCoercedBoolean.default('false'),
  commentsOnGetters: ZodCoercedBoolean.default('true'),
  commentsOnConstructors: ZodCoercedBoolean.default('true'),
  includeExampleCommentsMode: z.enum(getEnumValues(IncludeExampleCommentsMode)).default(IncludeExampleCommentsMode.ALWAYS),

  includeGenerated: ZodCoercedBoolean.default('true'),

  includeAlwaysNullProperties: ZodCoercedBoolean.default('false'),
});

export type CodeOptions = z.infer<typeof ZodCodeOptions>;
