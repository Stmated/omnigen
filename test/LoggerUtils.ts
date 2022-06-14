import {LoggerFactory} from '../src/util';
import pretty from 'pino-pretty';

export class LoggerUtils {

  static registerLoggerFix(): void {
    LoggerFactory.registerOptionsModifier((options) => {
      return pretty({...options, ...{sync: true, translateTime: true, singleLine: true}});
    });
  }
}
