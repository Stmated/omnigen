import {Booleanish, ModelTransformOptions, OptionResolvers, ParserOptions, TargetOptions} from '@omnigen/core';

export class StandardOptionResolvers {

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

  public static toRegExp(this: void, value: string | RegExp | undefined): Promise<RegExp | undefined> {

    if (!value) {
      return Promise.resolve(undefined);
    }

    if (value instanceof RegExp) {
      return Promise.resolve(value);
    }

    return Promise.resolve(new RegExp(value));
  }
}

export const PARSER_OPTIONS_RESOLVERS: OptionResolvers<ParserOptions> = {
  autoTypeHints: StandardOptionResolvers.toBoolean,
  relaxedLookup: StandardOptionResolvers.toBoolean,
  relaxedPlaceholders: StandardOptionResolvers.toBoolean,
  relaxedUnknownTypes: StandardOptionResolvers.toBoolean,
  trustedClients: StandardOptionResolvers.toBoolean,
  preferredWrapMode: StandardOptionResolvers.toBoolean,
};

export const TARGET_OPTION_RESOLVERS: OptionResolvers<TargetOptions> = {
  allowCompressInterfaceToInner: StandardOptionResolvers.toBoolean,
};

export const TRANSFORM_OPTIONS_RESOLVER: OptionResolvers<ModelTransformOptions> = {
  generificationBoxAllowed: StandardOptionResolvers.toBoolean,
  generifyTypes: StandardOptionResolvers.toBoolean,
};
