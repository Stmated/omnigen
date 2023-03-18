import {PluginHookCreator} from './PluginHookCreator';

export interface Plugin {
  name: string;

  init: PluginHookCreator;
}
