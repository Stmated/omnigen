import {getEnumValues, OmniTypeKind, OmniKindPrimitive, ToEnum, UnknownKind, ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';
import {ZodCodeOptions} from '@omnigen/target-code';

export const FieldAccessorMode = {
  NONE: 'NONE',
  POJO: 'POJO',
  LOMBOK: 'LOMBOK',
} as const;
export type FieldAccessorMode = ToEnum<typeof FieldAccessorMode>;

export const SerializationLibrary = {
  JACKSON: 'JACKSON',
  POJO: 'POJO',
} as const;
export type SerializationLibrary = ToEnum<typeof SerializationLibrary>;

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

export const SerializationConstructorAnnotationMode = {
  ALWAYS: 'ALWAYS',
  IF_REQUIRED: 'IF_REQUIRED',
  SKIP: 'SKIP',
} as const;
export type SerializationConstructorAnnotationMode = ToEnum<typeof SerializationConstructorAnnotationMode>;

export const JavaAnnotationLibrary = {
  JAKARTA: 'JAKARTA',
  JAVAX: 'JAVAX',
} as const;
export type JavaAnnotationLibrary = ToEnum<typeof JavaAnnotationLibrary>;

export const ZodJavaOptions = ZodCodeOptions.extend({
  immutableModels: ZodCoercedBoolean.default('true'),

  interfaceNamePrefix: z.string().default('I'),
  interfaceNameSuffix: z.string().default(''),
  fieldAccessorMode: z.enum(getEnumValues(FieldAccessorMode)).default(FieldAccessorMode.POJO),

  preferNumberType: z.enum(getEnumValues(OmniKindPrimitive)).default(OmniKindPrimitive.INTEGER),
  serializationLibrary: z.enum(getEnumValues(SerializationLibrary)).default(SerializationLibrary.JACKSON),
  javaAnnotationLibrary: z.enum(getEnumValues(JavaAnnotationLibrary)).default(JavaAnnotationLibrary.JAKARTA),
  serializationPropertyNameMode: z.enum(getEnumValues(SerializationPropertyNameMode)).default(SerializationPropertyNameMode.ALWAYS)
    .describe(`Useful to change to 'IF_REQUIRED' if you have enabled compiler flag '-parameters' and registered 'jackson-module-parameter-names'`),
  serializationConstructorAnnotationMode: z.enum(getEnumValues(SerializationConstructorAnnotationMode)).default(SerializationConstructorAnnotationMode.IF_REQUIRED),
  serializationEnsureRequiredFieldExistence: ZodCoercedBoolean.default('true'),
});

export type JavaOptions = z.infer<typeof ZodJavaOptions>;

export const DEFAULT_JAVA_OPTIONS: Readonly<JavaOptions> = ZodJavaOptions.parse({});
