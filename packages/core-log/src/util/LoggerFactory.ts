import pino, {BaseLogger, LoggerOptions, DestinationStream} from 'pino';

export type ModifierCallback = (options: LoggerOptions | DestinationStream) => LoggerOptions | DestinationStream;

/**
 * Creates loggers with the application's preferred format of logging.
 * Can be extended by registering options modifier callback by setting 'global.pinoModifiers' array.
 * Or by calling registerOptionsModifier().
 * Both of these must be done before any logger is created.
 */
export class LoggerFactory {

  private static _pretty: boolean | undefined = undefined;

  private static readonly _MODIFIERS: ModifierCallback[] = [];

  public static registerOptionsModifier(modifier: ModifierCallback): void {
    LoggerFactory._MODIFIERS.push(modifier);
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
      options.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      };
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
}
