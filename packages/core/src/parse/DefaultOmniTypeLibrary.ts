import {OmniType, OmniTypeLibrary} from '@omnigen/api';
import {OmniUtil} from './OmniUtil.ts';

export class DefaultOmniTypeLibrary implements OmniTypeLibrary {

  private readonly _types: OmniType[] = [];

  public get(absoluteUri: string | undefined): OmniType | undefined {

    if (!absoluteUri) {
      return undefined;
    }

    return this._types.find(it => it.absoluteUri == absoluteUri);
  }

  public register<T extends OmniType>(type: T): T {

    const existing = this.get(type.absoluteUri);
    if (existing) {

      if (existing.kind != type.kind) {
        throw new Error(`Trying to register ${OmniUtil.describe(type)} with absoluteUri ${type.absoluteUri} when ${OmniUtil.describe(existing)} already exists`);
      }

      return existing as T;
    }

    this._types.push(type);
    return type;
  }
}
