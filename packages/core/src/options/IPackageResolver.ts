import {OmniType} from '../parse/index.ts';
import {PackageOptions} from './PackageOptions';

export type IPackageResolver = (type: OmniType, typeName: string, options: PackageOptions) => string;
