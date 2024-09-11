import {DEFAULT_UNKNOWN_KIND, getEnumValues, ToEnum, UnknownKind, ZodCoercedBoolean, ZodTargetOptions} from '@omnigen/api';
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

export const PropertyTypeCommentMode = {
  ALWAYS: 'ALWAYS',
  FALLBACK: 'FALLBACK',
  NEVER: 'NEVER',
} as const;
export type PropertyTypeCommentMode = ToEnum<typeof PropertyTypeCommentMode>;

export const ZodCodeOptions = ZodTargetOptions.extend({
  immutable: ZodCoercedBoolean.default('true'),
  preferInferredType: ZodCoercedBoolean.default('true'),
  unknownType: z.enum(getEnumValues(UnknownKind)).default(DEFAULT_UNKNOWN_KIND),

  includeLinksOnType: ZodCoercedBoolean.default('false'),
  includeLinksOnProperty: ZodCoercedBoolean.default('true'),

  commentsOnTypes: ZodCoercedBoolean.default('true'),
  commentsOnFields: ZodCoercedBoolean.default('false'),
  commentsOnGetters: ZodCoercedBoolean.default('true'),
  commentsOnConstructors: ZodCoercedBoolean.default('true'),
  includeExampleCommentsMode: z.enum(getEnumValues(IncludeExampleCommentsMode)).default(IncludeExampleCommentsMode.ALWAYS),
  typeCommentsOnProperties: z.enum(getEnumValues(PropertyTypeCommentMode)).default(PropertyTypeCommentMode.NEVER),

  includeGenerated: ZodCoercedBoolean.default('true'),
  includeGeneratedInFileHeader: ZodCoercedBoolean.default('true'),

  includeAlwaysNullProperties: ZodCoercedBoolean.default('false'),

  serializationPropertyNameMode: z.enum(getEnumValues(SerializationPropertyNameMode)).default(SerializationPropertyNameMode.ALWAYS)
    .describe(`Useful to change to 'IF_REQUIRED' if you have enabled compiler flag '-parameters' and registered 'jackson-module-parameter-names'`),

  serializationEnsureRequiredFieldExistence: ZodCoercedBoolean.default('true')
    .describe(`If enabled, then required fields are ensured to exist in the serialized payload, even if null/undefined/similar`),

  /**
   * If we need to merge some types, then if the language supports unions, this is the max size of that union or we will find the common denominator.
   */
  maxAutoUnionSize: z.number().default(5),

  relaxedInspection: ZodCoercedBoolean.default('t')
    .describe(`If inspection is relaxed, then the auto-generated code might have file headers or similar added which ignores things such as unused declarations`),
});

export type CodeOptions = z.infer<typeof ZodCodeOptions>;
