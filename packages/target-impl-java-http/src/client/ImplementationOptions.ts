import {
  ZodCoercedBoolean, DEFAULT_PACKAGE_OPTIONS,
} from '@omnigen/api';
import {z} from 'zod';

export const ZodImplementationOptions = z.object({
  generateClient: ZodCoercedBoolean.default('t'),
  clientPackage: z.string().default(`${DEFAULT_PACKAGE_OPTIONS.package}.client`),
  generateServer: ZodCoercedBoolean.default('t'),
  serverPackage: z.string().default(`${DEFAULT_PACKAGE_OPTIONS.package}.server`),
  onErrorThrowExceptions: ZodCoercedBoolean,
});

export type ImplementationOptions = z.infer<typeof ZodImplementationOptions>;

// TODO: Need to make sure that the "default" is "other setting + plus suffix". Right now locked to default
export const DEFAULT_IMPLEMENTATION_OPTIONS: Readonly<ImplementationOptions> = ZodImplementationOptions.parse({});
