import {PluginOptions} from './PluginOptions';
import {PipelineCustomizer} from './PipelineCustomizer.ts';

export type PluginHookCreator = { (options: PluginOptions): PipelineCustomizer };
