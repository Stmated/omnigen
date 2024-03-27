import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {JsonSchemaPlugin} from './JsonSchemaPluginInit.ts';

export * from './parse';
export * from './transform';
export * from './visit';
export * from './definitions';
export * from './migrate';

export * as JsonSchemaPlugins from './JsonSchemaPluginInit.ts';

export default PluginAutoRegistry.register([JsonSchemaPlugin]);
