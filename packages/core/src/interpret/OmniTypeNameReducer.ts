import {CompressTypeNaming} from './CompressTypeNaming';

export type OmniTypeNameReducer = (groups: string[][]) => string | CompressTypeNaming | undefined;
