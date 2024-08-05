import {OmniModel} from './OmniModel.ts';

export interface OmniModelLibrary {
  get(absoluteUri: string): OmniModel | undefined;
  register(model: OmniModel): OmniModel;
}
