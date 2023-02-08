import {PluginInitializationResult} from './PluginInitializationResult';
import {PluginOptions} from './PluginOptions';

export type PluginInitializer = {(options: PluginOptions): PluginInitializationResult};

export interface Plugin {

  init: PluginInitializer;
}
