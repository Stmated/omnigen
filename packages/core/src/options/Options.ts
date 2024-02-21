import {z} from 'zod';

export function getEnumValues<T extends Record<string, any>>(obj: T) {
  return Object.values(obj) as [(typeof obj)[keyof T]];
}

export type ToEnum<T> = (T)[keyof T];

export const ZodCoercedBoolean = z
  .enum(['0', '1', 'true', 'false', 'yes', 'no', 't', 'f', 'y', 'n']).or(z.boolean()).or(z.number().min(0).max(1))
  // .optional()
  .default('false')
  .transform(value => {

    if (typeof value == 'number') {
      return value == 1;
    }

    if (typeof value == 'boolean') {
      return value;
    }

    return value == 'true'
      || value == 'yes'
      || value == 't'
      || value == 'y'
      || value == '1';
  });


export const ZodCoercedNumber = z.string().or(z.number()).pipe(z.coerce.number());

export const ZodOptions = z.object({});

export type Options = z.infer<typeof ZodOptions>;
