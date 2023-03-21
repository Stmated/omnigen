import {DEFAULT_PACKAGE_OPTIONS, Option, OptionResolvers, Options} from '@omnigen/core';

export interface ServerOptions extends Options {
  serverPackage: Option<string | undefined, string>;
}

// TODO: Need to make sure that the "default" is "other setting + plus suffix". Right now locked to default
export const DEFAULT_CLIENT_OPTIONS: ServerOptions = {
  serverPackage: `${DEFAULT_PACKAGE_OPTIONS.package}.server`,
};

export const CLIENT_OPTIONS_PARSER: OptionResolvers<ServerOptions> = {
  serverPackage: v => {
    if (v) {
      return v;
    }

    // TODO: Wrong, since it gets the default options and not the options we'd want.
    return `${DEFAULT_PACKAGE_OPTIONS.package}.server`;
  },
};
