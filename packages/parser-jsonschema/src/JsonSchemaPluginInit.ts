import {ZodSchemaFileContext} from '@omnigen/core';
import {ActionKind, createPlugin, ZodModelContext, ZodParserOptionsContext} from '@omnigen/core-plugin';
import {z} from 'zod';
import {DefaultJsonSchemaParser} from './parse';

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

      const obj = ctx.schemaFile.asObject();
      if (!obj) {
        return new z.ZodError([
          {code: 'custom', path: ['source'], message: `File is empty`},
        ]);
      }

      if (!(typeof obj == 'object')) {
        return new z.ZodError([
          {code: 'custom', path: ['source'], message: `File is not an object`},
        ]);
      }

      const schema = '$schema' in obj ? String(obj.$schema) : undefined;
      if (schema && !schema.includes('json-schema')) {
        return new z.ZodError([
          {code: 'custom', path: ['source'], message: `File is not a JsonSchema file, it is '${schema}'`},
        ]);
      }

      if (!schema && !('$id' in obj)) {
        return new z.ZodError([
          {code: 'custom', path: ['source'], message: `File is not a JsonSchema file`},
        ]);
      }
    }

    const parser = new DefaultJsonSchemaParser(ctx.schemaFile, ctx.parserOptions);
    const model = parser.parse();

    return {
      ...ctx,
      source: 'jsonschema',
      model: model.model,
    } as const;
  },
);
