import {OmniType} from './OmniModel.ts';

export interface OmniTypeLibrary {
  get(absoluteUri: string): OmniType | undefined;
  register<T extends OmniType>(type: T): T;
}
