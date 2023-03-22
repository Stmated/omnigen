import {Booleanish, ModelTransformOptions, OptionResolvers, ParserOptions, TargetOptions} from '@omnigen/core';

export class StandardOptionResolvers {

  public static toBoolean(this: void, value: Booleanish | undefined): boolean {

    if (value == undefined) {
      return false;
    }

    if (typeof value == 'boolean') {
      return value;
    }

    if (typeof value == 'string' && /^-?\d+$/.test(value)) {
      value = parseFloat(value);
    }

    if (typeof value == 'number') {
      return value !== 0;
    }

    const lowercase = value.toLowerCase();
    if (lowercase == 'true' || lowercase == 't' || lowercase == 'yes' || lowercase == 'y') {
      return true;
    } else if (lowercase == 'false' || lowercase == 'f' || lowercase == 'no' || lowercase == 'n') {
      return false;
    }

    // Any other string will count as false.
    return false;
  }

  public static toString(this: void, value: string | number): string {
    return String(value);
  }

  public static toRegExp(this: void, value: string | RegExp | undefined): RegExp | undefined {

    if (!value) {
      return undefined;
    }

    if (value instanceof RegExp) {
      return value;
    }

    return new RegExp(value);
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
  compressUnreferencedSubTypes: StandardOptionResolvers.toBoolean,
  compressSoloReferencedTypes: StandardOptionResolvers.toBoolean,
};

export const TRANSFORM_OPTIONS_RESOLVER: OptionResolvers<ModelTransformOptions> = {
  generificationBoxAllowed: StandardOptionResolvers.toBoolean,
  generifyTypes: StandardOptionResolvers.toBoolean,
};
