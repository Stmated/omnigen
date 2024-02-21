import {z} from 'zod';
import {JsonRpcParserOptions, ZodJsonRpcParserOptions} from './options';
import {createPlugin, ZodModelContext, ZodParserOptionsContext} from '@omnigen/core-plugin';
import {ZodSchemaFileContext} from '@omnigen/core-util';
import {OpenRpcParserBootstrapFactory} from './parse';
import {ParserBootstrap, ParserOptions} from '@omnigen/core';

const ZodJsonRpcParserOptionsContext = z.object({
  jsonRpcParserOptions: ZodJsonRpcParserOptions,
});

const ZodOpenRpcParserContext = z.object({
  openRpcParserBootstrap: z.custom<ParserBootstrap<JsonRpcParserOptions & ParserOptions>>(),
});

const OpenRpcArgsIn = ZodSchemaFileContext
  // .merge(ZodParserOptionsContext)
  .merge(ZodJsonRpcParserOptionsContext.partial());

const OpenRpcArgsOut = ZodSchemaFileContext
  .merge(ZodJsonRpcParserOptionsContext)
  .merge(ZodOpenRpcParserContext);

export const OpenRpcArgsSourcePlugin = createPlugin(
  {
    name: 'openrpc-args', in: OpenRpcArgsIn, out: OpenRpcArgsOut,
    score: 2,
    scoreModifier: (score, count, idx) => score * (1 - (idx / (count - 1))),
  },
  async ctx => {

    const openRpcParserBootstrapFactory = new OpenRpcParserBootstrapFactory();
    const openRpcParserBootstrap = (await openRpcParserBootstrapFactory.createParserBootstrap(ctx.schemaFile));
    const schemaIncomingOptions = openRpcParserBootstrap.getIncomingOptions();

    ctx.arguments = {...ctx.arguments, ...schemaIncomingOptions};

    const latestJsonRpcParserOptions = {
      ...ZodJsonRpcParserOptions.parse(ctx.arguments),
      ...ctx.jsonRpcParserOptions,
    };

    // const openRpcOptions: JsonRpcParserOptions & ParserOptions = {...ctx.parserOptions, ...latestJsonRpcParserOptions};

    return {
      ...ctx,
      arguments: ctx.arguments,
      jsonRpcParserOptions: latestJsonRpcParserOptions,
      openRpcParserBootstrap: openRpcParserBootstrap,
    } satisfies z.output<typeof OpenRpcArgsOut>;
  },
);

const OpenRpcParserIn = ZodParserOptionsContext
  .merge(ZodJsonRpcParserOptionsContext)
  .merge(ZodOpenRpcParserContext)
  .merge(ZodSchemaFileContext);

const OpenRpcParserOut = ZodParserOptionsContext
  .merge(ZodJsonRpcParserOptionsContext)
  .merge(ZodModelContext);

export const OpenRpcPlugin = createPlugin(
  {name: 'openrpc', in: OpenRpcParserIn, out: OpenRpcParserOut},
  async ctx => {

    const openRpcOptions: JsonRpcParserOptions & ParserOptions = {
      ...ctx.parserOptions,
      ...ctx.jsonRpcParserOptions,
    };

    const openRpcParser = ctx.openRpcParserBootstrap.createParser(openRpcOptions);
    const parseResult = await openRpcParser.parse();

    // TODO: NEED TO UPDATE ALL OPTIONS AFTER WE HAVE FOUND NEW ONES IN THIS FILE!!!!
    //          MUST HAVE A WAY OF RUNNING THIS EARLIER IN THE CHAIN! SPLIT INTO A PREP STEP AND THE ACTUAL PARSING!
    //          The preparation step must then be incentivized to run as early as possible!

    return {
      ...ctx,
      model: parseResult.model,
      jsonRpcParserOptions: parseResult.options,
    };
  },
);
