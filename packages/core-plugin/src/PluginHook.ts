import {
  PipelineBuilderEntrypoint,
  PipelineBuilderWithParser, PipelineBuilderWithDeserializer,
} from './PipelineBuilder';
import {RunOptions} from './RunOptions';

export interface PluginHook {

  entry?: (runOptions: RunOptions, builder: PipelineBuilderEntrypoint) => void;

  beforeParse?: (runOptions: RunOptions, builder: PipelineBuilderWithDeserializer) => void;

  afterParse?: (runOptions: RunOptions, builder: PipelineBuilderWithParser) => void;
}
