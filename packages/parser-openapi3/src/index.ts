import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {OpenApiPlugin} from './OpenApi3PluginInit.ts';

export * from './parse';

export * as OpenApiPlugins from './OpenApi3PluginInit.ts';

export default PluginAutoRegistry.register([OpenApiPlugin]);
