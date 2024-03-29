import {OmniInput, OmniModel, OmniOutput, OmniProperty, OmniType} from './OmniModel';

export type TypeOwner<T extends OmniType = OmniType> = T | OmniModel | OmniInput | OmniOutput | OmniProperty;
