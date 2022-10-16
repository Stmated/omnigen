import {IncomingOrRealOption, Options, IPackageResolver} from '../options';

export interface PackageOptions extends Options {
  package: string;
  packageResolver: IncomingOrRealOption<IPackageResolver | Record<string, string> | undefined, IPackageResolver | undefined>;
}

export const DEFAULT_PACKAGE_OPTIONS: PackageOptions = {
  package: 'generated.omnigen',
  packageResolver: undefined,
};
