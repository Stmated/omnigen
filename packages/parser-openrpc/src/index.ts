import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {OpenRpcPlugin} from './OpenRpcPluginInit.ts';

export * from './options/index.ts';
export * from './model';
export * from './parse';
export * from './OpenRpcPluginInit';

export default PluginAutoRegistry.register([OpenRpcPlugin]);
