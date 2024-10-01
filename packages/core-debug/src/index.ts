import {default as Debug} from 'debug';

export const createDebugLogger = (name: string) => {

  const slashIndex = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  if (slashIndex !== -1) {
    name = name.substring(slashIndex + 1);
  }

  const dotIndex = name.indexOf('.');
  if (dotIndex !== -1) {
    name = name.substring(0, dotIndex);
  }

  const logger_base = Debug(`omnigen:${name}`);
  return {
    silent: logger_base.extend('silent'),
    trace: logger_base.extend('trace'),
    debug: logger_base.extend('debug'),
    info: logger_base.extend('info'),
    warn: logger_base.extend('warn'),
    error: logger_base.extend('error'),
  };
};
