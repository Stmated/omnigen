import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {OpenRpcPlugin} from './OpenRpcPluginInit.ts';

export * from './options';
export * from './model';
export * from './parse';
export * from './visit';
export * from './OpenRpcPluginInit.ts';

export default PluginAutoRegistry.register([OpenRpcPlugin]);
