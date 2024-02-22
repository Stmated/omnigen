import {DEFAULT_PACKAGE_OPTIONS} from '@omnigen/core';
import {z} from 'zod';

export const ZodServerOptions = z.object({
  serverPackage: z.string().default(`${DEFAULT_PACKAGE_OPTIONS.package}.server`),
});

export type ServerOptions = z.output<typeof ZodServerOptions>;

// export interface ServerOptions extends Options {
//   serverPackage: Option<string | undefined, string>;
// }
//
// TODO: Need to make sure that the "default" is "other setting + plus suffix". Right now locked to default
// export const DEFAULT_CLIENT_OPTIONS: ServerOptions = {
//   serverPackage: `${DEFAULT_PACKAGE_OPTIONS.package}.server`,
// };
