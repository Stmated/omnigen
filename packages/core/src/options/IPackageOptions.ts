import {IncomingOrRealOption, IOptions, IPackageResolver} from '../options';

export interface IPackageOptions extends IOptions {
  package: string;
  packageResolver: IncomingOrRealOption<IPackageResolver | Record<string, string> | undefined, IPackageResolver | undefined>;
}

export const DEFAULT_PACKAGE_OPTIONS: IPackageOptions = {
  package: 'generated.omnigen',
  packageResolver: undefined,
}
