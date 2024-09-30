import pino, {BaseLogger, DestinationStream, LoggerOptions} from 'pino';
import {default as Debug} from 'debug';
import stripAnsi from 'strip-ansi';
// import punycode from "punycode/";

export type ModifierCallback = (options: LoggerOptions | DestinationStream) => LoggerOptions | DestinationStream;

/**
 * Creates loggers with the application's preferred format of logging.
 * Can be extended by registering options modifier callback by setting 'global.pinoModifiers' array.
 * Or by calling registerOptionsModifier().
 * Both of these must be done before any logger is created.
 */
export class LoggerFactory {
  private static _started = false;
  private static _pretty: boolean | undefined = undefined;
  private static _transport: LoggerOptions['transport'] | undefined = undefined;

  private static readonly _MODIFIERS: ModifierCallback[] = [];

  public static registerOptionsModifier(modifier: ModifierCallback): void {
    LoggerFactory._MODIFIERS.push(modifier);
  }

  public static enablePrettyPrint() {
    LoggerFactory._pretty = true;
  }

  public static consumeDebug() {
    if (!LoggerFactory._started) {

      const facades = new Map<string, BaseLogger>();
      Debug.log = (...args) => {
        const [namespace, ...message] = args;

        // Strip any ANSI color codes, let `pino` re-color.
        const cleanNamespace = namespace ? stripAnsi(namespace) : 'debug';
        const cleanMessages = message.map(it => (typeof it === 'string') ? stripAnsi(it) : it);

        let logger = facades.get(cleanNamespace);
        if (!logger) {
          logger = LoggerFactory.create(cleanNamespace);
          facades.set(cleanNamespace, logger);
        }

        if (cleanNamespace.endsWith(':error')) {
          logger.error(cleanMessages);
        } else if (cleanNamespace.endsWith(':warn')) {
          logger.warn(cleanMessages);
        } else if (cleanNamespace.endsWith(':info')) {
          logger.info(cleanMessages);
        } else if (cleanNamespace.endsWith(':trace')) {
          logger.trace(cleanMessages);
        } else if (cleanNamespace.endsWith(':silent')) {
          logger.silent(cleanMessages);
        } else {
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
  public static create(name: string): BaseLogger {
    const startIndex = name.lastIndexOf('/');
    if (startIndex != -1) {
      name = name.substring(startIndex + 1);
    }

    const endIndex = name.lastIndexOf('.');
    if (endIndex != -1) {
      name = name.substring(0, endIndex);
    }

    const options: LoggerOptions = {
      name: name,
      level: 'debug',
    };

    if (LoggerFactory._pretty === undefined) {
      try {
        require.resolve('pino-pretty');
        LoggerFactory._pretty = true;
      } catch (e) {
        LoggerFactory._pretty = false;
      }
    }

    if (LoggerFactory._pretty) {
      if (!LoggerFactory._transport) {
        LoggerFactory._transport = {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        };
      }

      options.transport = LoggerFactory._transport;
    }

    let modifiedOptions: LoggerOptions | DestinationStream = options;
    for (const modifier of LoggerFactory._MODIFIERS) {
      modifiedOptions = modifier(modifiedOptions);
    }

    if ('pinoModifiers' in global) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const globalModifiers = (global as Record<string, unknown>)['pinoModifiers'] as ModifierCallback[];
      for (const modifier of globalModifiers) {
        modifiedOptions = modifier(modifiedOptions);
      }
    }

    return pino(modifiedOptions);
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
