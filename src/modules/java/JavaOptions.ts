import {
  Booleanish,
  IncomingOrRealOption,
  IOptions,
  PrimitiveGenerificationChoice,
  RealOptions,
} from '@options';
import {OmniType} from '@parse';
import {IGenericTargetOptions} from '@interpret';

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
