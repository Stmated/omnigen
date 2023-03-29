import {LoggerFactory} from '@omnigen/core-log';
import {StandardOptionResolvers} from './StandardOptionResolvers';
import {
  Booleanish,
  IncomingOptions,
  Options,
  RealOptions,
  OptionResolvers,
  IncomingResolver,
  OptionAdditions,
} from '@omnigen/core';
import {Case} from '../util';

const logger = LoggerFactory.create(import.meta.url);

export class OptionsUtil {

  public static resolve<
    TBase extends Options,
    TInc extends Options | IncomingOptions<TBase>,
    TResolver extends OptionResolvers<TBase>,
    TAdditions extends OptionAdditions<TBase>
  >(
    base: TBase,
    incoming: TInc | undefined,
    resolvers?: TResolver,
    additions?: TAdditions,
  ): Exclude<TInc, keyof TBase> & RealOptions<Pick<TBase, keyof TBase>> {

    const copiedBase = {...base};
    const alteredBase = this.getBaseWithOptionalAdditions(copiedBase, incoming, resolvers, additions);
    return this.replaceOptionsWithConverted(alteredBase, incoming, resolvers);
  }

  private static replaceOptionsWithConverted<
    TOpt extends Options,
    TInc extends IncomingOptions<TOpt>,
    TResolver extends OptionResolvers<TOpt>,
    TReturn extends RealOptions<TOpt>
  >(
    base: Required<TOpt>,
    incoming: TInc | undefined,
    resolvers?: TResolver,
  ): TReturn {

    for (const baseKey in base) {
      if (!(baseKey in base)) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const converter: IncomingResolver<unknown, unknown> | undefined = resolvers?.[baseKey];
      if (converter) {

        const rawValue = (incoming && baseKey in incoming) ? incoming[baseKey] : base[baseKey];
        // const convertedValue =
        // const convertedValue = convertedPromise;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        base[baseKey] = converter(rawValue);
      } else if (incoming && baseKey in incoming) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        base[baseKey] = incoming[baseKey];
      }
    }

    // At this point all properties should be set.
    // If this could be done *safely* with generics somehow, that would be absolutely awesome.
    return base as TReturn;
  }

  private static getBaseWithOptionalAdditions<
    TOpt extends Options,
    TInc extends IncomingOptions<TOpt>,
    TAdditions extends OptionAdditions<TOpt>,
    TResolver extends OptionResolvers<TOpt>
  >(
    base: Required<TOpt>,
    incoming: TInc | undefined,
    resolvers?: TResolver,
    additions?: TAdditions,
  ): TOpt {

    if (!additions) {
      return base;
    }

    for (const additionKey in additions) {
      if (!(additionKey in additions)) {
        continue;
      }

      const addition = additions[additionKey];
      if (!addition) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = (incoming?.[additionKey] || base[additionKey]);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const converter = resolvers?.[additionKey] as IncomingResolver<unknown, any> | undefined;
      if (converter) {

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const converted = converter(value);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const newBase = addition(converted);

        if (newBase) {
          base = {...base, ...newBase};
        }
      } else {

        // There is no converter for this addition, so just send in what we got.

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const newBase = addition(value);
        if (newBase) {
          base = {...base, ...newBase};
        }
      }
    }

    return base;
  }

  public static toBoolean(this: void, value: Booleanish | undefined): boolean {
    return StandardOptionResolvers.toBoolean(value);
  }

  public static toString(this: void, value: string | number): string {
    return StandardOptionResolvers.toString(value);
  }

  public static updateOptionsFromDocument<TOpt extends Options>(doc: Record<string, Record<string, unknown>>, opt: TOpt): void {

    // TODO: This should be moved somewhere generic, since it should work the same in all languages.
    // TODO: Also need to incorporate the options parsers into this somehow
    const unsafeOptions = opt as unknown as Record<string, unknown>;
    const customOptions = doc['x-omnigen'];
    if (customOptions) {
      logger.info(`Received options ${JSON.stringify(customOptions)}`);
      const optionsKeys = Object.keys(customOptions);
      for (const key of optionsKeys) {

        const value = customOptions[key];
        const camelKey = Case.camel(key);

        if (value !== undefined) {

          const existingType = typeof (unsafeOptions[camelKey]);
          const newType = typeof (value);

          unsafeOptions[camelKey] = value;
          if (existingType !== newType && existingType != 'undefined') {
            logger.warn(`Set option '${camelKey}' to '${String(value)}' (but '${newType}' != '${existingType}'`);
          } else {
            logger.debug(`Set option '${camelKey}' to '${String(value)}'`);
          }
        }
      }
    }
  }
}
