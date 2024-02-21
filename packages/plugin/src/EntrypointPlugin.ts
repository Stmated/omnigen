import {
  createPlugin,
  PluginAutoRegistry,
  ZodArgumentsContext,
  ZodModelTransformOptionsContext,
  ZodPackageOptionsContext,
  ZodParserOptionsContext,
  ZodTargetOptionsContext,
} from '@omnigen/core-plugin';
import {ZodModelTransformOptions, ZodPackageOptions, ZodParserOptions, ZodTargetOptions} from '@omnigen/core';

const ZodStdOptionsContext = ZodArgumentsContext
  .merge(ZodParserOptionsContext)
  .merge(ZodTargetOptionsContext)
  .merge(ZodModelTransformOptionsContext)
  .merge(ZodPackageOptionsContext);

// TODO: Might need to be split up to make use of arguments from the schema file or whatnot.
//        To make this more valid there might be a need for a "higher/lower score if earlier/later" multiplier
const stdOptionsPlugin = createPlugin(
  {name: 'opt', in: ZodArgumentsContext, out: ZodStdOptionsContext},
  async ctx => {

    return {
      ...ctx,
      parserOptions: ZodParserOptions.parse(ctx.arguments),
      modelTransformOptions: ZodModelTransformOptions.parse(ctx.arguments),
      targetOptions: ZodTargetOptions.parse(ctx.arguments),
      packageOptions: ZodPackageOptions.parse(ctx.arguments),
    };
  },
);

const plugins = PluginAutoRegistry.register([stdOptionsPlugin]);

export {
  plugins,
};
