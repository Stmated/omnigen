import pino from "pino";

export * from '@model';
export * from '@parse';
export * from './Omnigen'

export const logger = pino({
  name: 'app-name',
  level: 'debug'
});
