import {default as Debug} from 'debug';
import stripAnsi from 'strip-ansi';
import chalk from 'chalk';
import PrettyError from 'pretty-error';
import * as process from 'node:process';
import hsl from 'color-space/hsl.js';

const pe = new PrettyError();

const RealDate = Date;

const LogLevelStrings: readonly string[] = ['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'];

const chalkLightGray = chalk.rgb(180, 180, 180);
const chalkLighterGray = chalk.rgb(220, 220, 220);

const BR_L = chalkLighterGray('[');
const BR_R = chalkLighterGray(']');

const baseColors = [
  chalk.white,
  chalk.red,
  chalk.green,
  chalk.yellow,
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
  chalk.gray,

  chalk.redBright,
  chalk.greenBright,
  chalk.yellowBright,
  chalk.blueBright,
  chalk.magentaBright,
  chalk.cyanBright,
  chalk.whiteBright,
];

const namespaceColorMap = new Map<string, string>();

/**
 * TODO: Do not expose the "...args"? And instead only expose the specific ones?
 */
export interface Logger {
  silent(message: string, error?: Error): void;
  silent(message: string, object: object, error?: Error): void;
  silent(...args: any[]): void;

  trace(message: string, error?: Error): void;
  trace(message: string, object: object, error?: Error): void;
  trace(...args: any[]): void;

  debug(message: string, error?: Error): void;
  debug(message: string, object: object, error?: Error): void;
  debug(...args: any[]): void;

  info(message: string, error?: Error): void;
  info(message: string, object: object, error?: Error): void;
  info(...args: any[]): void;

  warn(message: string, error?: Error): void;
  warn(message: string, object: object, error?: Error): void;
  warn(...args: any[]): void;

  error(message: string, error?: Error): void;
  error(message: string, object: object, error?: Error): void;
  error(...args: any[]): void;

  fatal(message: string, error?: Error): void;
  fatal(message: string, object: object, error?: Error): void;
  fatal(...args: any[]): void;
}

const DEBUG_ENV_KEY = 'DEBUG';
const LOG_LEVEL_ENV_KEY = 'LOG_LEVEL';

const hasDebugEnv = !!(process.env[DEBUG_ENV_KEY]);
const rootLogLevel = (process.env[LOG_LEVEL_ENV_KEY] ?? 'debug').toLowerCase();
const rootLogLevelIndex = LogLevelStrings.indexOf(rootLogLevel);
if (rootLogLevelIndex === -1) {
  throw new Error(`Invalid log level: ${rootLogLevel}`);
}

/**
 * Creates loggers with the application's preferred format of logging.
 * Can be extended by registering options modifier callback by setting 'global.pinoModifiers' array.
 * Or by calling registerOptionsModifier().
 * Both of these must be done before any logger is created.
 */
export class LoggerFactory {

  private static _started = false;

  public static enablePrettyPrint() {

  }

  public static consumeDebug() {
    if (!LoggerFactory._started) {

      const facades = new Map<string, Logger>();
      Debug.log = (...args) => {
        const [namespace, ...message] = args;

        // Strip any ANSI color codes, we will use our own colors.
        const cleanNamespace = namespace ? stripAnsi(namespace) : '';
        const colonIndex = cleanNamespace.lastIndexOf(':');

        const namespaceSuffix = (colonIndex === -1) ? 'debug' : cleanNamespace.substring(colonIndex + 1).toLowerCase();
        const baseNamespace = LogLevelStrings.includes(namespaceSuffix) ? cleanNamespace.substring(0, colonIndex) : cleanNamespace;
        const cleanMessages = message.map(it => (typeof it === 'string') ? stripAnsi(it) : it);

        let logger = facades.get(baseNamespace);
        if (!logger) {
          logger = LoggerFactory.create(baseNamespace);
          facades.set(baseNamespace, logger);
        }

        if (namespaceSuffix === 'fatal') {
          logger.fatal(cleanMessages);
        } else if (namespaceSuffix === 'error') {
          logger.error(cleanMessages);
        } else if (namespaceSuffix === 'warn') {
          logger.warn(cleanMessages);
        } else if (namespaceSuffix === 'info') {
          logger.info(cleanMessages);
        } else if (namespaceSuffix === 'trace') {
          logger.trace(cleanMessages);
        } else if (namespaceSuffix === 'silent') {
          logger.silent(cleanMessages);
        } else {
          // debug as fallback
          logger.debug(cleanMessages);
        }
      };

      LoggerFactory._started = true;
    }
  }

  /**
   * Creates a logger with the specified name.
   * Usually the node constant: import.meta.url
   *
   * @param name - A simple name, or filename. Avoid long names.
   * @returns A new logger
   */
  public static create(name: string): Logger {
    const startIndex = name.lastIndexOf('/');
    if (startIndex != -1) {
      name = name.substring(startIndex + 1);
    }

    const endIndex = name.lastIndexOf('.');
    if (endIndex != -1) {
      name = name.substring(0, endIndex);
    }

    return new DefaultLogger(name);
  }

  public static formatError(err: unknown, message?: string): Error {
    try {
      if (message) {
        message = ` - ${message}`;
      }

      const errorLog: Error = {
        name: `Unknown`,
        message: `${err}${message || ''}`,
      };

      let pointer: unknown | undefined;

      if (err instanceof Error) {
        errorLog.name = err.name;
        errorLog.message = `${err.message}${message || ''}`;

        if (err.stack) {
          errorLog.stack = err.stack;
        }

        pointer = err.cause;
      }

      let max = 6;
      while (pointer && max-- > 0) {
        if (pointer instanceof Error) {
          errorLog.message += `\n${pointer.message}`;
          if (pointer.stack) {
            errorLog.stack = `${errorLog.stack ?? ''}\nCaused by ${pointer.name}: ${pointer.message ? pointer.message : '???'}\n${pointer.stack}`;
          }

          pointer = pointer.cause;
        } else {
          pointer = undefined;
        }
      }

      return errorLog;
    } catch (ex) {
      throw err;
    }
  }
}


class DefaultLogger implements Logger {

  private static readonly _MAX_LOGGER_NAME_WIDTH = 25;

  private readonly _name: string;
  private readonly _shortName: string;

  constructor(name: string) {
    this._name = name;

    this._shortName = this._name;
    if (this._shortName.length > DefaultLogger._MAX_LOGGER_NAME_WIDTH) {
      this._shortName = this._shortName.substring(this._shortName.length - DefaultLogger._MAX_LOGGER_NAME_WIDTH);
    } else {
      this._shortName = this._shortName.padEnd(DefaultLogger._MAX_LOGGER_NAME_WIDTH, ' ');
    }

    let coloredName = namespaceColorMap.get(this._shortName);
    if (!coloredName) {

      if (chalk.level === 3) {

        // We can use `rgb` here. Much more free range of colors. Not sure how well it works, since I have not been able to test it.
        const halfSaturation = Math.floor(hsl.max[1] / 2);
        const halfLightness = Math.floor(hsl.max[2] / 2);

        const h = (137.508 * namespaceColorMap.size) % hsl.max[0];

        const calculatedHsl = [
          h,
          halfSaturation + (Math.random() * halfSaturation),
          halfLightness + (Math.random() * halfLightness),
        ];

        const rgb = hsl.rgb(calculatedHsl);

        const newNamespaceColor = chalk.rgb(rgb[0], rgb[1], rgb[2]);
        coloredName = newNamespaceColor(this._shortName);

      } else if (chalk.level === 2) {

        // 0 = black,
        // 1..231 = Readable colors
        // 232..255 = grayscale
        const newNamespaceColor = chalk.ansi256((namespaceColorMap.size % 230) + 1);
        coloredName = newNamespaceColor(this._shortName);
      } else {

        const newNamespaceColor = baseColors[namespaceColorMap.size % baseColors.length];
        coloredName = newNamespaceColor(this._shortName);
      }

      namespaceColorMap.set(this._shortName, coloredName);
    }

    this._shortName = coloredName;
  }

  silent(...args: any[]): void {
    this.log(0, s => chalk.dim(chalk.gray(s)), args);
  }

  trace(...args: any[]): void {
    this.log(1, chalk.gray, args);
  }

  debug(...args: any[]): void {
    this.log(2, chalk.magenta, args);
  }

  info(...args: any[]): void {
    this.log(3, chalk.blue, args);
  }

  warn(...args: any[]): void {
    this.log(4, chalk.yellow, args);
  }

  error(...args: any[]): void {
    this.log(5, chalk.red, args);
  }

  fatal(...args: any[]): void {
    this.log(6, chalk.redBright, args);
  }

  private log(levelIndex: keyof typeof LogLevelStrings & number, colorFn: (str: string) => string, args: any[]): void {

    const level = LogLevelStrings[levelIndex];
    if (hasDebugEnv && !Debug.enabled(`${this._name}:${level}`)) {

      // This logger has been disabled by the `DEBUG` env.
      return;
    }

    if (levelIndex < rootLogLevelIndex) {

      // Or, this logger has been disabled by the `LOG_LEVEL` env.
      return;
    }

    const message = (args.length > 0) ? args[0] : '???';
    const error = args.length > 0 && args[args.length - 1] instanceof Error ? args[args.length - 1] as Error : undefined;
    const errorMessage = error ? ` ${pe.render(error, false, true)}` : '';

    let date = `${BR_L}${chalkLightGray(new RealDate().toISOString())}${BR_R}`;
    if (RealDate !== Date) {
      date += ` ${BR_L}${chalk.gray(new Date().toISOString())}${BR_R}`;
    }

    console.log(`${date} ${BR_L}${colorFn(level.padEnd(6, ' '))}${BR_R} ${BR_L}${this._shortName}${BR_R} ${colorFn(message)}${errorMessage}`);
  }
}
