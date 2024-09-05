import {PluginAutoRegistry} from '@omnigen/core-plugin';
import {CommonTransformPlugin, CommonTransform2Plugin, fileWriter, CorePlugin} from './CoreUtilPluginInit.ts';

export * from './ast';
export * from './parse';
export * from './util';
export * from './visit';
export * from './write';
export * from './CoreUtilPluginInit.ts';

export * from './reducer/ProxyReducer.ts';
export * from './reducer/ProxyReducerOmni.ts';
export type {ProxyReducerArg} from './reducer/types.ts';

export * from './reducer2/ProxyReducer2.ts';
export * from './reducer2/ProxyReducerOmni2.ts';
export type {ProxyReducerArg2} from './reducer2/types.ts';

export default PluginAutoRegistry.register([CorePlugin, CommonTransformPlugin, CommonTransform2Plugin, fileWriter]);
