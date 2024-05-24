import {getEnumValues, ToEnum, UnknownKind, ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';

export const IncludeExampleCommentsMode = {
  ALWAYS: 'ALWAYS',
  SKIP: 'SKIP',
} as const;
export type IncludeExampleCommentMode = ToEnum<typeof IncludeExampleCommentsMode>;

export const SerializationPropertyNameMode = {
  /**
   * If not compiling with '-parameters' nor registered 'jackson-module-parameter-names' to ObjectMapper, then use this.
   */
  ALWAYS: 'ALWAYS',
  /**
   * If you are compiling with '-parameters' and have registered 'jackson-module-parameter-names' to ObjectMapper, then use this for less annotation clutter.
   */
  IF_REQUIRED: 'IF_REQUIRED',
  SKIP: 'SKIP',
} as const;
export type SerializationPropertyNameMode = ToEnum<typeof SerializationPropertyNameMode>;

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

  serializationPropertyNameMode: z.enum(getEnumValues(SerializationPropertyNameMode)).default(SerializationPropertyNameMode.ALWAYS)
    .describe(`Useful to change to 'IF_REQUIRED' if you have enabled compiler flag '-parameters' and registered 'jackson-module-parameter-names'`),

  serializationEnsureRequiredFieldExistence: ZodCoercedBoolean.default('true'),
});

export type CodeOptions = z.infer<typeof ZodCodeOptions>;
