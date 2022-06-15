import {IOptions} from '@options';

export enum UnknownType {
  MAP,
  JSON,
  OBJECT
}

export interface JavaOptions extends IOptions {
  immutableModels: boolean;
  package: string;
  includeAlwaysNullProperties: boolean;
  unknownType: UnknownType;
  includeLinksOnType: boolean;
  includeLinksOnProperty: boolean;
}

export const DEFAULT_JAVA_OPTIONS: JavaOptions = {
  immutableModels: true,
  package: 'generated.omnigen',
  includeAlwaysNullProperties: false,
  unknownType: UnknownType.JSON,
  includeLinksOnType: false,
  includeLinksOnProperty: true,
}
