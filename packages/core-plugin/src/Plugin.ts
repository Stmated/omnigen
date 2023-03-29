import {PluginBoot} from './PluginBoot.ts';

export interface Plugin {
  name: string;

  init: PluginBoot;
}
