import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {CommonTransformPlugin, CommonTransform2Plugin, fileWriter, CorePlugin} from './CoreUtilPluginInit';

export * from './ast';
export * from './parse';
export * from './util';
export * from './visit';
export * from './write';
export * from './CoreUtilPluginInit';

export * from './reducer2/ProxyReducer2';
export * from './reducer2/ProxyReducerOmni2';
export type {ProxyReducerArg2} from './reducer2/types';
export {ANY_KIND} from './reducer2/types';

export * as CorePlugins from './CoreUtilPluginInit';

export default PluginAutoRegistry.register([CorePlugin, CommonTransformPlugin, CommonTransform2Plugin, fileWriter]);
