import {createPlugin, PluginAutoRegistry, ZodModelContext, ZodPackageOptionsContext, ZodTargetOptionsContext} from '@omnigen/core-plugin';
import {JavaPlugins} from '@omnigen/target-java';
import {ZodImplementationOptions} from './ImplementationOptions.ts';
import {ZodAstNodeContext, ZodAstNodesContext} from '@omnigen/core';
import {JavaHttpImplementationGenerator} from './JavaHttpImplementationGenerator.ts';
import {z} from 'zod';

export * from './ImplementationOptions.js';
export * from './JavaHttpImplementationGenerator.js';

export const ZodImplementationOptionsContext = z.object({
  implementationOptions: ZodImplementationOptions,
});

export const ZodJavaHttpPluginIn = JavaPlugins.ZodJavaOptionsContext
  .merge(ZodPackageOptionsContext)
  .merge(ZodTargetOptionsContext)
  .merge(ZodAstNodeContext)
  .merge(ZodImplementationOptionsContext)
  .merge(ZodModelContext);

export const JavaHttpClientPlugin = createPlugin(
  {name: 'java-http-client', in: ZodJavaHttpPluginIn, out: ZodAstNodesContext},
  async ctx => {

    const generator = new JavaHttpImplementationGenerator();

    const nodes = await generator.generate({
      model: ctx.model,
      root: ctx.astNode,

      targetOptions: {...ctx.packageOptions, ...ctx.targetOptions, ...ctx.javaOptions},
      implOptions: ctx.implementationOptions,
    });

    return {
      astNodes: nodes,
    };
  },
);

export default PluginAutoRegistry.register([JavaHttpClientPlugin]);
