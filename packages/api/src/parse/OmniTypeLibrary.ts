import {OmniType} from './OmniModel';

export interface OmniTypeLibrary {
  get(absoluteUri: string): OmniType | undefined;
  register<T extends OmniType>(type: T): T;
}
