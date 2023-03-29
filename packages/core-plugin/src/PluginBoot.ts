import {PipelineCustomizer} from './PipelineCustomizer.ts';

export interface PluginHook {
  registerCustomizer(customizer: PipelineCustomizer): void;
}

export type PluginBoot = {(hook: PluginHook): void};
