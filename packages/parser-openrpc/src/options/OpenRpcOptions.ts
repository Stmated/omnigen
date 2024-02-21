import {ZodOptions} from '@omnigen/core';
import {z} from 'zod';

export const ZodOpenRpc10Options = ZodOptions.extend({
  openRpcVersion: z.literal('1.0').default('1.0'),
});
export const ZodOpenRpc11Options = ZodOptions.extend({
  openRpcVersion: z.literal('1.1').default('1.1'),
});
export const ZodOpenRpc12Options = ZodOptions.extend({
  openRpcVersion: z.literal('1.2').default('1.2'),
});

export const ZodOpenRpcOptions = z.union([
  ZodOpenRpc10Options,
  ZodOpenRpc11Options,
  ZodOpenRpc12Options,
]);

export type IncomingOpenRpcOptions = z.input<typeof ZodOpenRpcOptions>;
export type OpenRpcOptions = z.output<typeof ZodOpenRpcOptions>;
export type OpenRpc10Options = z.output<typeof ZodOpenRpc10Options>;
export type OpenRpc11Options = z.output<typeof ZodOpenRpc11Options>;
export type OpenRpc12Options = z.output<typeof ZodOpenRpc12Options>;
export type OpenRpcVersion = OpenRpcOptions['openRpcVersion'];

export const DEFAULT_OPENRPC10_OPTIONS: Readonly<OpenRpc10Options> = ZodOpenRpc10Options.parse({});
export const DEFAULT_OPENRPC11_OPTIONS: Readonly<OpenRpc11Options> = ZodOpenRpc11Options.parse({});
export const DEFAULT_OPENRPC12_OPTIONS: Readonly<OpenRpc12Options> = ZodOpenRpc12Options.parse({});
