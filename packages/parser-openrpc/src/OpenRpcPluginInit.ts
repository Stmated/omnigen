import {z} from 'zod';
import {JsonRpcParserOptions, ZodJsonRpcParserOptions} from './options';
import {createPlugin, PluginAutoRegistry, ZodModelContext, ZodPackageOptionsContext, ZodParserOptionsContext} from '@omnigen/core-plugin';
import {ZodSchemaFileContext} from '@omnigen/core';
import {OpenRpcParserBootstrapFactory} from './parse';
import {PackageOptions, ParserOptions, ZodPackageOptions, ZodParserOptions} from '@omnigen/api';

const ZodJsonRpcParserOptionsContext = z.object({
  jsonRpcParserOptions: ZodJsonRpcParserOptions,
});

export const ZodOpenRpcSourceContext = z.object({
  source: z.literal('openrpc'),
});

const OpenRpcParserIn = ZodParserOptionsContext
  .merge(ZodOpenRpcSourceContext.partial())
  .merge(ZodJsonRpcParserOptionsContext.partial())
  .merge(ZodPackageOptionsContext.partial())
  .merge(ZodSchemaFileContext);

const OpenRpcParserOut = ZodParserOptionsContext
  .merge(ZodOpenRpcSourceContext)
  .merge(ZodJsonRpcParserOptionsContext)
  .merge(ZodPackageOptionsContext)
  .merge(ZodModelContext);

export const OpenRpcPlugin = createPlugin(
  {name: 'openrpc', in: OpenRpcParserIn, out: OpenRpcParserOut},
  async ctx => {

    if (ctx.source !== undefined && ctx.source != 'openrpc') {
      return new z.ZodError([
        {code: 'custom', path: ['source'], message: `Source is not OpenRpc`},
      ]);
    } else if (ctx.source == undefined) {

      const obj = await ctx.schemaFile.asObject();
      if (!obj || !(typeof obj == 'object') || !('openrpc' in obj)) {
        return new z.ZodError([
          {code: 'custom', path: ['source'], message: `File is not an OpenRpc file`},
        ]);
      }
    }

    const openRpcParserBootstrapFactory = new OpenRpcParserBootstrapFactory();
    const openRpcParserBootstrap = (await openRpcParserBootstrapFactory.createParserBootstrap(ctx.schemaFile));
    const schemaIncomingOptions = openRpcParserBootstrap.getIncomingOptions();

    // Arguments from CLI has higher precedence than the arguments from the schema.
    ctx.arguments = {
      ...schemaIncomingOptions,
      ...ctx.arguments,
    };

    if (!ctx.arguments.jsonRpcVersion) {
      ctx.arguments.jsonRpcVersion = '2.0';
    }

    const packageOptions: PackageOptions = ZodPackageOptions.parse({...ctx.defaults, ...ctx.packageOptions, ...ctx.arguments});
    const parserOptions: ParserOptions = ZodParserOptions.parse({...ctx.defaults, ...ctx.parserOptions, ...ctx.arguments});
    const jsonRpcOptions: JsonRpcParserOptions = {...ZodJsonRpcParserOptions.parse({...ctx.defaults, ...ctx.arguments}), ...ctx.jsonRpcParserOptions};

    const openRpcOptions: JsonRpcParserOptions & ParserOptions = {
      ...parserOptions,
      ...jsonRpcOptions,
    };

    const openRpcParser = openRpcParserBootstrap.createParser(openRpcOptions);
    const parseResult = await openRpcParser.parse();

    // TODO: NEED TO UPDATE ALL OPTIONS AFTER WE HAVE FOUND NEW ONES IN THIS FILE!
    //          MUST HAVE A WAY OF RUNNING THIS EARLIER IN THE CHAIN! SPLIT INTO A PREP STEP AND THE ACTUAL PARSING!
    //          The preparation step must then be incentivized to run as early as possible!

    return {
      ...ctx,
      source: 'openrpc',
      model: parseResult.model,
      jsonRpcParserOptions: parseResult.options,
      parserOptions: parserOptions,
      packageOptions: packageOptions,
      arguments: ctx.arguments,
    } satisfies z.output<typeof OpenRpcParserOut>;
  },
);

export default PluginAutoRegistry.register([OpenRpcPlugin]);
