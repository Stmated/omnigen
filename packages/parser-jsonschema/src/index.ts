import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {JsonSchemaPlugin} from './JsonSchemaPluginInit.ts';

export * from './parse';
export * from './transform';
export * from './visit';

export * as JsonSchemaPlugins from './JsonSchemaPluginInit.ts';

export default PluginAutoRegistry.register([JsonSchemaPlugin]);
