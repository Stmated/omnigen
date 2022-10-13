import {
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  OptionConverters,
  OptionsUtil,
  PackageResolverOptionsParser,
  PrimitiveGenerificationChoice,
  RealOptions,
} from '@omnigen/core';
import {IJavaOptions} from './IJavaOptions';

export enum UnknownType {
  MAP,
  JSON,
  OBJECT,
}

export const DEFAULT_JAVA_OPTIONS: RealOptions<IJavaOptions> = {
  ...DEFAULT_PACKAGE_OPTIONS,
  ...DEFAULT_TARGET_OPTIONS,
  immutableModels: true,
  includeAlwaysNullProperties: false,
  unknownType: UnknownType.JSON,
  includeLinksOnType: false,
  includeLinksOnProperty: true,
  onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
  packageResolver: undefined,
};

export const JAVA_OPTIONS_CONVERTERS: OptionConverters<IJavaOptions> = {
  packageResolver: v => Promise.resolve(new PackageResolverOptionsParser().parse(v)),
  immutableModels: OptionsUtil.toBoolean,
  includeAlwaysNullProperties: OptionsUtil.toBoolean,
  includeLinksOnProperty: OptionsUtil.toBoolean,
  includeLinksOnType: OptionsUtil.toBoolean,
};
