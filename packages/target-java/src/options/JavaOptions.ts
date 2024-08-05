import {getEnumValues, OmniKindPrimitive, ToEnum, ZodCoercedBoolean} from '@omnigen/api';
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
  interfaceNamePrefix: z.string().default('I'),
  interfaceNameSuffix: z.string().default(''),

  fieldAccessorMode: z.enum(getEnumValues(FieldAccessorMode)).default(FieldAccessorMode.POJO),
  lombokBuilder: ZodCoercedBoolean.default(false),
  lombokGetter: ZodCoercedBoolean.default(false),
  lombokSetter: ZodCoercedBoolean.default(false),
  lombokRequiredConstructor: ZodCoercedBoolean.default(false),

  preferNumberType: z.enum(getEnumValues(OmniKindPrimitive)).default(OmniKindPrimitive.INTEGER),
  serializationLibrary: z.enum(getEnumValues(SerializationLibrary)).default(SerializationLibrary.JACKSON),
  javaAnnotationLibrary: z.enum(getEnumValues(JavaAnnotationLibrary)).default(JavaAnnotationLibrary.JAKARTA),
  serializationConstructorAnnotationMode: z.enum(getEnumValues(SerializationConstructorAnnotationMode)).default(SerializationConstructorAnnotationMode.IF_REQUIRED),

  singleFile: ZodCoercedBoolean.default('f'),
  singleFileName: z.string().optional(),

  beanValidation: ZodCoercedBoolean.default(true),
});

export type JavaOptions = z.infer<typeof ZodJavaOptions>;

export const DEFAULT_JAVA_OPTIONS: Readonly<JavaOptions> = ZodJavaOptions.parse({});
