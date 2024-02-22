import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {JsonSchemaPlugin} from './JsonSchemaPluginInit.ts';

export * from './parse/index.js';

export default PluginAutoRegistry.register([JsonSchemaPlugin]);
