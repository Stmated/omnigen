import {OmniType} from '../parse/index.js';
import {PackageOptions} from './PackageOptions';

export type IPackageResolver = (type: OmniType, typeName: string, options: PackageOptions) => string;
