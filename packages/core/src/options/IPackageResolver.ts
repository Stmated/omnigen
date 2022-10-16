import {OmniType} from '../parse';
import {PackageOptions} from '../options';

export type IPackageResolver = (type: OmniType, typeName: string, options: PackageOptions) => string;
