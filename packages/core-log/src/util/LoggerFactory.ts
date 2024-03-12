import pino, {BaseLogger, LoggerOptions, DestinationStream} from 'pino';
// import punycode from "punycode/";

export type ModifierCallback = (options: LoggerOptions | DestinationStream) => LoggerOptions | DestinationStream;

/**
 * Creates loggers with the application's preferred format of logging.
 * Can be extended by registering options modifier callback by setting 'global.pinoModifiers' array.
 * Or by calling registerOptionsModifier().
 * Both of these must be done before any logger is created.
 */
export class LoggerFactory {
  private static _pretty: boolean | undefined = undefined;
  private static _transport: LoggerOptions['transport'] | undefined = undefined;

  private static readonly _MODIFIERS: ModifierCallback[] = [];

  public static registerOptionsModifier(modifier: ModifierCallback): void {
    LoggerFactory._MODIFIERS.push(modifier);
  }

  public static enablePrettyPrint() {
    LoggerFactory._pretty = true;
  }

  /**
   * Creates a logger with the specified name.
   * Usually the node constant: import.meta.url
   *
   * @param name A simple name, or filename. Avoid long names.
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
      level: 'trace',
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
        message: `${err}${message}`,
      };

      let pointer: unknown | undefined;

      if (err instanceof Error) {
        errorLog.name = err.name;
        errorLog.message = `${err.message}${message}`;

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
