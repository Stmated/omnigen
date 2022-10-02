import {
  Booleanish,
  IncomingOrRealOption,
  IOptions,
  PrimitiveGenerificationChoice,
  RealOptions,
} from '@options';
import {OmniType} from '@parse';
import {DEFAULT_TARGET_OPTIONS, IGenericTargetOptions} from '@interpret';
import {IncomingConverters, OptionsUtil} from '@options/OptionsUtil';
import {PackageResolverOptionsParser} from '@options/PackageResolverOptionsParser';

export enum UnknownType {
  MAP,
  JSON,
  OBJECT
}

export interface IPackageOptions extends IOptions {
  package: string;
  packageResolver: IncomingOrRealOption<Record<string, string> | undefined, IPackageResolver | undefined>;
}

export interface IJavaOptions extends IGenericTargetOptions, IPackageOptions {
  immutableModels: IncomingOrRealOption<Booleanish, boolean>;
  includeAlwaysNullProperties: IncomingOrRealOption<Booleanish, boolean>;
  unknownType: UnknownType;
  includeLinksOnType: IncomingOrRealOption<Booleanish, boolean>;
  includeLinksOnProperty: IncomingOrRealOption<Booleanish, boolean>;
}

export const DEFAULT_PACKAGE_OPTIONS: IPackageOptions = {
  package: 'generated.omnigen',
  packageResolver: undefined,
}

export const DEFAULT_JAVA_OPTIONS: RealOptions<IJavaOptions> = {
  ...DEFAULT_PACKAGE_OPTIONS,
  ...DEFAULT_TARGET_OPTIONS,
  ...{
    immutableModels: true,
    includeAlwaysNullProperties: false,
    unknownType: UnknownType.JSON,
    includeLinksOnType: false,
    includeLinksOnProperty: true,
    onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
    packageResolver: undefined,
  }
}

export type IPackageResolver = (type: OmniType, typeName: string, options: IPackageOptions) => string;

export const JAVA_OPTIONS_CONVERTERS: IncomingConverters<IJavaOptions> = {
  packageResolver: (v) => new PackageResolverOptionsParser().parse(v),
  immutableModels: OptionsUtil.toBoolean,
  includeAlwaysNullProperties: OptionsUtil.toBoolean,
  includeLinksOnProperty: OptionsUtil.toBoolean,
  includeLinksOnType: OptionsUtil.toBoolean,
};
