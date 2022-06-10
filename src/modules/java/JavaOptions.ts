import {IOptions} from '@options';

export interface JavaOptions extends IOptions {
  immutableModels: boolean;
  package: string;
}

export const DEFAULT_JAVA_OPTIONS: JavaOptions = {
  immutableModels: true,
  package: 'generated.omnigen',
}
