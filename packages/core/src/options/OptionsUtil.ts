import {camelCase} from 'change-case';
import {
  Booleanish,
  IncomingOptions,
  IncomingOrRealOption,
  IOptions,
  OmitNever,
  RealOptions
} from '../options';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(__filename);

export type IncomingConverter<TInc, TReal> = (incoming: TInc | TReal) => Promise<TReal>;

export type OptionConverters<TOpt extends IOptions> = OmitNever<{
  [Key in keyof TOpt]: TOpt[Key] extends IncomingOrRealOption<infer TInc, infer TReal>
    ? TOpt[Key] extends TReal
      ? never
      : IncomingConverter<TInc, TReal>
    : never
}>;

export type OptionAdditions<TOpt extends IOptions> = {
  [Key in keyof TOpt]?: TOpt[Key] extends IncomingOrRealOption<infer _TInc, infer TReal>
    ? (value: TReal) => IncomingOptions<TOpt> | undefined
    : (value: TOpt[Key]) => IncomingOptions<TOpt> | undefined
};

// TODO: THERE MUST BE SOME WAY TO GET RID OF ALL THE GENERIC HACKS!!! IT SHOULD BE LOGICALLY SOLVABLE!

export class OptionsUtil {

  public static async updateOptions<
    TOpt extends IOptions,
    TInc extends IncomingOptions<TOpt>,
    TConverters extends OptionConverters<TOpt>,
    TAdditions extends OptionAdditions<TOpt>,
    TReturn extends RealOptions<TOpt>,
  >(
    base: TOpt,
    incoming: TInc | undefined,
    converters?: TConverters,
    additions?: TAdditions,
  ): Promise<TReturn> {

    const copiedBase = {...base};
    const alteredBase = await this.getBaseWithOptionalAdditions(copiedBase, incoming, converters, additions);
    return this.replaceOptionsWithConverted(alteredBase, incoming, converters);
  }

  private static async replaceOptionsWithConverted<
    TOpt extends IOptions,
    TInc extends IncomingOptions<TOpt>,
    TConverters extends OptionConverters<TOpt>,
    TReturn extends RealOptions<TOpt>,
  >(
    base: Required<TOpt>,
    incoming: TInc | undefined,
    converters?: TConverters
  ): Promise<TReturn> {

    for (const baseKey in base) {
      if (!Object.hasOwn(base, baseKey)) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const converter: IncomingConverter<unknown, unknown> | undefined = converters?.[baseKey];
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
    TOpt extends IOptions,
    TInc extends IncomingOptions<TOpt>,
    TAdditions extends OptionAdditions<TOpt>,
    TConverters extends OptionConverters<TOpt>,
  >(
    base: Required<TOpt>,
    incoming: TInc | undefined,
    converters?: TConverters,
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
      const converter = converters?.[additionKey] as IncomingConverter<unknown, any> | undefined;
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

    if (value == undefined) {
      return Promise.resolve(false);
    }

    if (typeof value == 'boolean') {
      return Promise.resolve(value);
    }

    if (typeof value == 'string' && /^-?\d+$/.test(value)) {
      value = parseFloat(value);
    }

    if (typeof value == 'number') {
      return Promise.resolve(value !== 0);
    }

    const lowercase = value.toLowerCase();
    if (lowercase == 'true' || lowercase == 't' || lowercase == 'yes' || lowercase == 'y') {
      return Promise.resolve(true);
    } else if (lowercase == 'false' || lowercase == 'f' || lowercase == 'no' || lowercase == 'n') {
      return Promise.resolve(false);
    }

    // Any other string will count as false.
    return Promise.resolve(false);
  }

  public static toString(this: void, value: string | number): Promise<string> {
    return Promise.resolve(String(value));
  }

  public static updateOptionsFromDocument<TOpt extends IOptions>(doc: Record<string, Record<string, unknown>>, opt: TOpt): void {

    // TODO: This should be moved somewhere generic, since it should work the same in all languages.
    // TODO: Also need to incorporate the options parsers into this somehow
    const unsafeOptions = opt as unknown as Record<string, unknown>;
    const customOptions = doc['x-omnigen'];
    if (customOptions) {
      logger.info(`Received options ${JSON.stringify(customOptions)}`);
      const optionsKeys = Object.keys(customOptions);
      for (const key of optionsKeys) {

        const value = customOptions[key];
        const camelKey = camelCase(key);

        if (value !== undefined) {

          const existingType = typeof (unsafeOptions[camelKey]);
          const newType = typeof (value);

          unsafeOptions[camelKey] = value;
          if (existingType !== newType && existingType != 'undefined') {
            logger.warn(`Set option '${camelKey}' to '${String(value)}' (but '${newType}' != '${existingType}'`);
          } else {
            logger.info(`Set option '${camelKey}' to '${String(value)}'`);
          }
        }
      }
    }
  }
}
