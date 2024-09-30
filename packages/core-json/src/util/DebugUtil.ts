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
    debug: logger_base.extend('debug'),
    info: logger_base.extend('info'),
    trace: logger_base.extend('trace'),
    silent: logger_base.extend('silent'),
  };
};
