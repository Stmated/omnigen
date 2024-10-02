import {OmniModel} from './OmniModel';

export interface OmniModelLibrary {
  get(absoluteUri: string): OmniModel | undefined;
  register(model: OmniModel): OmniModel;
}
