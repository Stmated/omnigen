import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {OpenRpcArgsSourcePlugin, OpenRpcPlugin} from './OpenRpcPluginInit.ts';

export * from './options';
export * from './model';
export * from './parse';
export * from './OpenRpcPluginInit';

export default PluginAutoRegistry.register([OpenRpcArgsSourcePlugin, OpenRpcPlugin]);
