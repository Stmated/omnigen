import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {JsonSchemaPlugin} from './JsonSchemaPluginInit.ts';

export * from './parse/index.ts';
export * from './transform/index.ts';
export * from './visit/index.ts';

export default PluginAutoRegistry.register([JsonSchemaPlugin]);
export {visitUniformArray} from './visit';
export {visitUniformObject} from './visit';
export {safeSet} from './visit';
export {ToArray} from './visit';
export {Defined} from './visit';
export {DocVisitorUnknownTransformer} from './visit';
export {DocVisitorTransformer} from './visit';
export {ToSingle} from './visit';
