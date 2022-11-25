import {
  Booleanish, DEFAULT_GENERIC_TARGET_OPTIONS,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_TARGET_OPTIONS, GENERIC_TARGET_OPTIONS_RESOLVER,
  GenericTargetOptions,
  OmniPrimitiveBoxMode,
  Option,
  OptionResolvers,
  OptionsUtil,
  PackageOptions,
  PackageResolverOptionsParser,
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
  commentsOnTypes: Option<Booleanish, boolean>;
  commentsOnFields: Option<Booleanish, boolean>;
  commentsOnGetters: Option<Booleanish, boolean>;
  commentsOnConstructors: Option<Booleanish, boolean>;
}

export const DEFAULT_JAVA_OPTIONS: JavaOptions = {
  ...DEFAULT_PACKAGE_OPTIONS,
  ...DEFAULT_TARGET_OPTIONS,
  ...DEFAULT_GENERIC_TARGET_OPTIONS,
  immutableModels: true,
  includeAlwaysNullProperties: false,
  unknownType: UnknownType.JSON,
  includeLinksOnType: false,
  includeLinksOnProperty: true,
  packageResolver: undefined,
  interfaceNamePrefix: 'I',
  interfaceNameSuffix: '',
  fieldAccessorMode: FieldAccessorMode.POJO,
  commentsOnTypes: true,
  commentsOnFields: false,
  commentsOnGetters: true,
  commentsOnConstructors: true,
};

export const JAVA_OPTIONS_RESOLVER: OptionResolvers<JavaOptions> = {
  ...GENERIC_TARGET_OPTIONS_RESOLVER,
  packageResolver: v => Promise.resolve(new PackageResolverOptionsParser().parse(v)),
  immutableModels: OptionsUtil.toBoolean,
  includeAlwaysNullProperties: OptionsUtil.toBoolean,
  includeLinksOnProperty: OptionsUtil.toBoolean,
  includeLinksOnType: OptionsUtil.toBoolean,
  commentsOnTypes: OptionsUtil.toBoolean,
  commentsOnFields: OptionsUtil.toBoolean,
  commentsOnGetters: OptionsUtil.toBoolean,
  commentsOnConstructors: OptionsUtil.toBoolean,
};
