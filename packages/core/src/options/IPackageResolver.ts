import {OmniType} from '../parse';
import {IPackageOptions} from '../options';

export type IPackageResolver = (type: OmniType, typeName: string, options: IPackageOptions) => string;
