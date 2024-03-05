import {ZodSchemaFileContext} from '@omnigen/core-util';
import {ActionKind, createPlugin, ZodModelContext, ZodParserOptionsContext} from '@omnigen/core-plugin';
import {z} from 'zod';
import {NewJsonSchemaParser} from './parse/index.ts';

export const ZodJsonSchemaSourceContext = z.object({
  source: z.literal('jsonschema'),
});

const JsonSchemaParserIn = ZodParserOptionsContext
  .merge(ZodJsonSchemaSourceContext.partial())
  .merge(ZodSchemaFileContext);

const JsonSchemaParserOut = ZodParserOptionsContext
  .merge(ZodModelContext)
  .merge(ZodJsonSchemaSourceContext);

export const JsonSchemaPlugin = createPlugin(
  {name: 'jsonschema', in: JsonSchemaParserIn, out: JsonSchemaParserOut, action: ActionKind.SPLITS},
  async ctx => {

    if (ctx.source !== undefined && ctx.source != 'jsonschema') {
      return new z.ZodError([
        {code: 'custom', path: ['source'], message: `Source is not JsonSchema`},
      ]);
    } else if (ctx.source == undefined) {

      const obj = await ctx.schemaFile.asObject();
      if (!obj || !(typeof obj == 'object') || (!('$schema' in obj) && !('$id' in obj))) {
        return new z.ZodError([
          {code: 'custom', path: ['source'], message: `File is not a JsonSchema file`},
        ]);
      }
    }

    const parser = new NewJsonSchemaParser(ctx.schemaFile, ctx.parserOptions);
    const model = await parser.parse();

    return {
      ...ctx,
      source: 'jsonschema',
      model: model.model,
    } as const;
  },
);
