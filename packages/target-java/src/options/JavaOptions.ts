import {
  Booleanish,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  GenericTargetOptions,
  IncomingOrRealOption,
  OptionConverters,
  OptionsUtil,
  PackageOptions,
  PackageResolverOptionsParser,
  PrimitiveGenerificationChoice,
  RealOptions,
} from '@omnigen/core';

export enum UnknownType {
  MAP,
  JSON,
  OBJECT,
}

export interface JavaOptions extends GenericTargetOptions, PackageOptions {
  immutableModels: IncomingOrRealOption<Booleanish, boolean>;
  includeAlwaysNullProperties: IncomingOrRealOption<Booleanish, boolean>;
  unknownType: UnknownType;
  includeLinksOnType: IncomingOrRealOption<Booleanish, boolean>;
  includeLinksOnProperty: IncomingOrRealOption<Booleanish, boolean>;
}

export const DEFAULT_JAVA_OPTIONS: RealOptions<JavaOptions> = {
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

export const JAVA_OPTIONS_CONVERTERS: OptionConverters<JavaOptions> = {
  packageResolver: v => Promise.resolve(new PackageResolverOptionsParser().parse(v)),
  immutableModels: OptionsUtil.toBoolean,
  includeAlwaysNullProperties: OptionsUtil.toBoolean,
  includeLinksOnProperty: OptionsUtil.toBoolean,
  includeLinksOnType: OptionsUtil.toBoolean,
};
