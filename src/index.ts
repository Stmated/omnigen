import pino from "pino";

export * from '@parse';
export * from './Omnigen'

export const logger = pino({
  name: 'app-name',
  level: 'debug'
});
