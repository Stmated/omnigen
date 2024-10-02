import {z} from 'zod';
import {createPlugin, PluginAutoRegistry, ZodModelContext, ZodPackageOptionsContext, ZodTargetOptionsContext} from '@omnigen/core-plugin';
import {ZodAstNodeContext, ZodAstNodesContext} from '@omnigen/api';
import {Java, JavaPlugins} from '@omnigen/target-java';
import {LoggerFactory} from '@omnigen/core-log';
import {ZodImplementationOptions} from './client/ImplementationOptions';
import {JavaHttpImplementationGenerator} from './client/JavaHttpImplementationGenerator';

const logger = LoggerFactory.create(import.meta.url);

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
      root: ctx.astNode as Java.JavaAstRootNode,

      targetOptions: {...ctx.packageOptions, ...ctx.targetOptions, ...ctx.javaOptions},
      implOptions: ctx.implementationOptions,
    });

    return {
      ...ctx,
      astNodes: [ctx.astNode, ...nodes],
    };
  },
);

logger.info(`Registering Java Client plugins`);
export default PluginAutoRegistry.register([JavaHttpClientPlugin]);
