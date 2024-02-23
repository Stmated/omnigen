import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {CommonTransformPlugin, CommonTransform2Plugin, fileWriter, CorePlugin} from './CoreUtilPluginInit.ts';

export * from './equality';
export * from './interpret';
export * from './parse';
export * from './util';
export * from './visit';
export * from './write';
export {ZodSchemaFileContext, ZodCompilationUnitsContext, ZodWrittenFilesContext} from './CoreUtilPluginInit.ts';

export default PluginAutoRegistry.register([CorePlugin, CommonTransformPlugin, CommonTransform2Plugin, fileWriter]);