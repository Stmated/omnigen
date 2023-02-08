import {PluginQualifier} from './PluginQualifier';

export interface PluginOptions<TArgs = Record<string, unknown>> {
  qualifier: PluginQualifier;
  args: TArgs;
}
