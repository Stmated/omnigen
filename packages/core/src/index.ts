import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {CommonTransformPlugin, CommonTransform2Plugin, fileWriter, CorePlugin} from './CoreUtilPluginInit.ts';

export * from './ast';
export * from './equality';
export * from './parse';
export * from './util';
export * from './visit';
export * from './write';
export * from './CoreUtilPluginInit.ts';

export default PluginAutoRegistry.register([CorePlugin, CommonTransformPlugin, CommonTransform2Plugin, fileWriter]);
