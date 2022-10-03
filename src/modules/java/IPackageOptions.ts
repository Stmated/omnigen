import {IncomingOrRealOption, IOptions} from '@options';
import {IPackageResolver} from '@java/JavaOptions';

export interface IPackageOptions extends IOptions {
  package: string;
  packageResolver: IncomingOrRealOption<Record<string, string> | undefined, IPackageResolver | undefined>;
}

export const DEFAULT_PACKAGE_OPTIONS: IPackageOptions = {
  package: 'generated.omnigen',
  packageResolver: undefined,
}
