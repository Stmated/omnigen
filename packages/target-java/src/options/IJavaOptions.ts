import {IPackageOptions, IGenericTargetOptions, IncomingOrRealOption, Booleanish} from '@omnigen/core';
import {UnknownType} from './JavaOptions';

export interface IJavaOptions extends IGenericTargetOptions, IPackageOptions {
  immutableModels: IncomingOrRealOption<Booleanish, boolean>;
  includeAlwaysNullProperties: IncomingOrRealOption<Booleanish, boolean>;
  unknownType: UnknownType;
  includeLinksOnType: IncomingOrRealOption<Booleanish, boolean>;
  includeLinksOnProperty: IncomingOrRealOption<Booleanish, boolean>;
}
