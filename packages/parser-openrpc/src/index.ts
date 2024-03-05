import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {OpenRpcPlugin} from './OpenRpcPluginInit.ts';

export * from './options/index.ts';
export * from './model/index.ts';
export * from './parse/index.ts';
export * from './visit/index.ts';
export * from './OpenRpcPluginInit';

export default PluginAutoRegistry.register([OpenRpcPlugin]);
