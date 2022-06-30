import {LoggerFactory} from '../src/util';
import pretty from 'pino-pretty';

export class LoggerUtils {

  private static _registered = false;

  static registerLoggerFix(): void {
    if (LoggerUtils._registered) {
      return;
    }

    LoggerUtils._registered = true;
    LoggerFactory.registerOptionsModifier((options) => {
      return pretty({...options, ...{sync: true, translateTime: true, singleLine: true}});
    });
  }
}
