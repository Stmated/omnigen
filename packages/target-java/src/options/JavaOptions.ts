import {
  Booleanish,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  GenericTargetOptions,
  Option,
  OptionResolvers,
  OptionsUtil,
  PackageOptions,
  PackageResolverOptionsParser,
  PrimitiveGenerificationChoice,
} from '@omnigen/core';

export enum UnknownType {
  MAP,
  JSON,
  OBJECT,
}

export enum FieldAccessorMode {
  NONE,
  POJO,
  LOMBOK,
}

export interface JavaOptions extends GenericTargetOptions, PackageOptions {
  immutableModels: Option<Booleanish, boolean>;
  includeAlwaysNullProperties: Option<Booleanish, boolean>;
  unknownType: UnknownType;
  includeLinksOnType: Option<Booleanish, boolean>;
  includeLinksOnProperty: Option<Booleanish, boolean>;
  interfaceNamePrefix: string,
  interfaceNameSuffix: string,
  fieldAccessorMode: FieldAccessorMode;
}

export const DEFAULT_JAVA_OPTIONS: JavaOptions = {
  ...DEFAULT_PACKAGE_OPTIONS,
  ...DEFAULT_TARGET_OPTIONS,
  immutableModels: true,
  includeAlwaysNullProperties: false,
  unknownType: UnknownType.JSON,
  includeLinksOnType: false,
  includeLinksOnProperty: true,
  generifyTypes: true,
  onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
  packageResolver: undefined,
  interfaceNamePrefix: 'I',
  interfaceNameSuffix: '',
  fieldAccessorMode: FieldAccessorMode.POJO,
};

export const JAVA_OPTIONS_RESOLVER: OptionResolvers<JavaOptions> = {
  packageResolver: v => Promise.resolve(new PackageResolverOptionsParser().parse(v)),
  immutableModels: OptionsUtil.toBoolean,
  includeAlwaysNullProperties: OptionsUtil.toBoolean,
  includeLinksOnProperty: OptionsUtil.toBoolean,
  includeLinksOnType: OptionsUtil.toBoolean,
};
