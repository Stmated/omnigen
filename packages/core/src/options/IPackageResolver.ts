import {OmniType} from '../parse/index.js';
import {PackageOptions} from '../options/index.js';

export type IPackageResolver = (type: OmniType, typeName: string, options: PackageOptions) => string;
