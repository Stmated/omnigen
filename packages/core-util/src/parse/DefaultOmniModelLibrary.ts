import {OmniModel, OmniModelLibrary} from '@omnigen/core';

export class DefaultOmniModelLibrary implements OmniModelLibrary {

  private readonly _models: OmniModel[] = [];

  public get(absoluteUri: string | undefined): OmniModel | undefined {

    if (!absoluteUri) {
      return undefined;
    }

    return this._models.find(it => it.absoluteUri == absoluteUri);
  }

  public register(model: OmniModel): OmniModel {

    const existing = this.get(model.absoluteUri);
    if (existing) {

      if (existing != model) {
        throw new Error(`Trying to register ${model.name} with absoluteUri ${model.absoluteUri} when it already exists`);
      }

      return existing;
    }

    this._models.push(model);
    return model;
  }
}
