import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {JsonSchemaPlugin} from './JsonSchemaPluginInit.ts';

export * from './parse/index.ts';
export * from './transform/index.ts';
export * from './visit/index.ts';

export default PluginAutoRegistry.register([JsonSchemaPlugin]);
