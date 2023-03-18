import {PluginOptions} from './PluginOptions';
import {PluginHook} from './PluginHook';

export type PluginHookCreator = { (options: PluginOptions): PluginHook };
