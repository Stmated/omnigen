import {DEFAULT_PACKAGE_OPTIONS} from '@omnigen/api';
import {z} from 'zod';

export const ZodServerOptions = z.object({
  serverPackage: z.string().default(`${DEFAULT_PACKAGE_OPTIONS.package}.server`),
});

export type ServerOptions = z.output<typeof ZodServerOptions>;
