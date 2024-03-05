import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {CommonTransformPlugin, CommonTransform2Plugin, fileWriter, CorePlugin} from './CoreUtilPluginInit.ts';

export * from './equality/index.ts';
export * from './interpret/index.ts';
export * from './parse/index.ts';
export * from './util/index.ts';
export * from './visit/index.ts';
export * from './write/index.ts';
export {ZodSchemaFileContext, ZodCompilationUnitsContext, ZodWrittenFilesContext} from './CoreUtilPluginInit.ts';

export default PluginAutoRegistry.register([CorePlugin, CommonTransformPlugin, CommonTransform2Plugin, fileWriter]);
