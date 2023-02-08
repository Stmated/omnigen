import {
  Booleanish,
  Option,
  OptionResolvers,
  PackageOptions,
  TargetOptions,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  UnknownKind,
} from '@omnigen/core';
import {
  OptionsUtil,
  PackageResolverOptionsParser,
  TARGET_OPTION_RESOLVERS,
  TRANSFORM_OPTIONS_RESOLVER,
} from '@omnigen/core-util';

export enum FieldAccessorMode {
  NONE,
  POJO,
  LOMBOK,
}

export interface JavaOptions extends TargetOptions, PackageOptions {
  immutableModels: Option<Booleanish, boolean>;
  includeAlwaysNullProperties: Option<Booleanish, boolean>;
  unknownType: UnknownKind;
  includeLinksOnType: Option<Booleanish, boolean>;
  includeLinksOnProperty: Option<Booleanish, boolean>;
  interfaceNamePrefix: string,
  interfaceNameSuffix: string,
  fieldAccessorMode: FieldAccessorMode;
  commentsOnTypes: Option<Booleanish, boolean>;
  commentsOnFields: Option<Booleanish, boolean>;
  commentsOnGetters: Option<Booleanish, boolean>;
  commentsOnConstructors: Option<Booleanish, boolean>;
  preferVar: Option<Booleanish, boolean>;
  includeGeneratedAnnotation: Option<Booleanish, boolean>;
}

export const DEFAULT_JAVA_OPTIONS: JavaOptions = {
  ...DEFAULT_PACKAGE_OPTIONS,
  ...DEFAULT_TARGET_OPTIONS,
  immutableModels: true,
  includeAlwaysNullProperties: false,
  unknownType: UnknownKind.MUTABLE_OBJECT,
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
  preferVar: true,
  includeGeneratedAnnotation: true,
};

export const JAVA_OPTIONS_RESOLVER: OptionResolvers<JavaOptions> = {
  ...TRANSFORM_OPTIONS_RESOLVER,
  ...TARGET_OPTION_RESOLVERS,
  packageResolver: v => Promise.resolve(new PackageResolverOptionsParser().parse(v)),
  immutableModels: OptionsUtil.toBoolean,
  includeAlwaysNullProperties: OptionsUtil.toBoolean,
  includeLinksOnProperty: OptionsUtil.toBoolean,
  includeLinksOnType: OptionsUtil.toBoolean,
  commentsOnTypes: OptionsUtil.toBoolean,
  commentsOnFields: OptionsUtil.toBoolean,
  commentsOnGetters: OptionsUtil.toBoolean,
  commentsOnConstructors: OptionsUtil.toBoolean,
  preferVar: OptionsUtil.toBoolean,
  includeGeneratedAnnotation: OptionsUtil.toBoolean,
};
