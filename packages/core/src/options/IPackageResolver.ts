import {OmniType} from '../parse';
import {PackageOptions} from './PackageOptions';

export type IPackageResolver = (type: OmniType, typeName: string, options: PackageOptions) => string;
