import {LoggerFactory} from '@omnigen/core-log';
import {Option} from './Option.js';
import {Options} from './Options.js';
import {Booleanish} from './Booleanish.js';
import {IncomingOptions} from './IncomingOptions.js';
import {RealOptions} from './RealOptions.js';
import {Case} from '../util/index.js';
import {StandardOptionResolvers} from './StandardOptionResolvers.js';

const logger = LoggerFactory.create(import.meta.url);

export type IncomingResolver<TInc, TReal> = (incoming: TInc | TReal) => Promise<TReal>;

type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type OptionResolvers<TOpt extends Options> = OmitNever<{
  [Key in keyof TOpt]: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? TOpt[Key] extends TReal
      ? never
      : IncomingResolver<TInc, TReal>
    : never
}>;

export type OptionAdditions<TOpt extends Options> = {
  [Key in keyof TOpt]?: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? (value: TInc) => Partial<RealOptions<TOpt>> | undefined
    : (value: TOpt[Key]) => Partial<RealOptions<TOpt>> | undefined
};

export class OptionsUtil {

  public static async updateOptions<
    TOpt extends Options,
    TInc extends IncomingOptions<TOpt>,
    TResolver extends OptionResolvers<TOpt>,
    TAdditions extends OptionAdditions<TOpt>,
    TReturn extends RealOptions<TOpt>
  >(
    base: TOpt,
    incoming: TInc | undefined,
    resolvers?: TResolver,
    additions?: TAdditions,
  ): Promise<TReturn> {

    const copiedBase = {...base};
    const alteredBase = await this.getBaseWithOptionalAdditions(copiedBase, incoming, resolvers, additions);
    return this.replaceOptionsWithConverted(alteredBase, incoming, resolvers);
  }

  private static async replaceOptionsWithConverted<
    TOpt extends Options,
    TInc extends IncomingOptions<TOpt>,
    TResolver extends OptionResolvers<TOpt>,
    TReturn extends RealOptions<TOpt>
  >(
    base: Required<TOpt>,
    incoming: TInc | undefined,
    resolvers?: TResolver,
  ): Promise<TReturn> {

    for (const baseKey in base) {
      if (!Object.hasOwn(base, baseKey)) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const converter: IncomingResolver<unknown, unknown> | undefined = resolvers?.[baseKey];
      if (converter) {

        const rawValue = (incoming && baseKey in incoming) ? incoming[baseKey] : base[baseKey];
        const convertedPromise = converter(rawValue);
        const convertedValue = await convertedPromise;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        base[baseKey] = convertedValue;
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

  private static async getBaseWithOptionalAdditions<
    TOpt extends Options,
    TInc extends IncomingOptions<TOpt>,
    TAdditions extends OptionAdditions<TOpt>,
    TResolver extends OptionResolvers<TOpt>
  >(
    base: Required<TOpt>,
    incoming: TInc | undefined,
    resolvers?: TResolver,
    additions?: TAdditions,
  ): Promise<TOpt> {

    if (!additions) {
      return base;
    }

    for (const additionKey in additions) {
      if (!Object.hasOwn(additions, additionKey)) {
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
        const converted = await converter(value);
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

  public static toBoolean(this: void, value: Booleanish | undefined): Promise<boolean> {
    return StandardOptionResolvers.toBoolean(value);
  }

  public static toString(this: void, value: string | number): Promise<string> {
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
