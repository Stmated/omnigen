import {
  Booleanish,
  DEFAULT_PACKAGE_OPTIONS,
  Option,
  OptionResolvers,
  Options,
  StandardOptionResolvers,
} from '@omnigen/core';

export interface ImplementationOptions extends Options {
  generateClient: Option<Booleanish, boolean>;
  clientPackage: Option<string | undefined, string>;
  generateServer: Option<Booleanish, boolean>;
  serverPackage: Option<string | undefined, string>;
  onErrorThrowExceptions: Option<Booleanish, boolean>;
}

// TODO: Need to make sure that the "default" is "other setting + plus suffix". Right now locked to default
export const DEFAULT_IMPLEMENTATION_OPTIONS: ImplementationOptions = {
  generateClient: true,
  clientPackage: `${DEFAULT_PACKAGE_OPTIONS.package}.client`,
  generateServer: true,
  serverPackage: `${DEFAULT_PACKAGE_OPTIONS.package}.server`,
  onErrorThrowExceptions: true,
};

export const IMPLEMENTATION_OPTIONS_PARSERS: OptionResolvers<ImplementationOptions> = {
  clientPackage: v => {
    if (v) {
      return Promise.resolve(v);
    }

    // TODO: Wrong, since it gets the default options and not the options we'd want.
    return Promise.resolve(`${DEFAULT_PACKAGE_OPTIONS.package}.client`);
  },
  serverPackage: v => {
    if (v) {
      return Promise.resolve(v);
    }

    // TODO: Wrong, since it gets the default options and not the options we'd want.
    return Promise.resolve(`${DEFAULT_PACKAGE_OPTIONS.package}.server`);
  },
  generateClient: StandardOptionResolvers.toBoolean,
  generateServer: StandardOptionResolvers.toBoolean,
  onErrorThrowExceptions: StandardOptionResolvers.toBoolean,
};
