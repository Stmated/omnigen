import {ZodSchemaFileContext} from '@omnigen/core';
import {ActionKind, createPlugin, PluginAutoRegistry, ZodModelContext, ZodParserOptionsContext} from '@omnigen/core-plugin';
import {z} from 'zod';
import {OpenApiJsonSchemaParser} from './parse/OpenApiJsonSchemaParser';
import {AnyJSONSchema, ExternalDocumentsFinder, JSONSchema9Definition} from '@omnigen/parser-jsonschema';
import {OpenAPIV3_1} from 'openapi-types';

export const ZodOpenApiSourceContext = z.object({
  source: z.literal('openapi'),
});

const OpenApiParserIn = ZodParserOptionsContext
  .merge(ZodOpenApiSourceContext.partial())
  .merge(ZodSchemaFileContext);

const OpenApiParserOut = ZodParserOptionsContext
  .merge(ZodModelContext)
  .merge(ZodOpenApiSourceContext);

export const OpenApiPlugin = createPlugin(
  {name: 'openapi', in: OpenApiParserIn, out: OpenApiParserOut, action: ActionKind.SPLITS},
  async ctx => {

    if (ctx.source !== undefined && ctx.source != 'openapi') {
      return new z.ZodError([
        {code: 'custom', path: ['source'], message: `Source is not OpenAPI`},
      ]);
    } else if (ctx.source == undefined) {

      const obj = ctx.schemaFile.asObject();
      if (!obj || !(typeof obj == 'object') || !('openapi' in obj)) {
        return new z.ZodError([
          {code: 'custom', path: ['source'], message: `File is not an OpenAPI file`},
        ]);
      }
    }

    const documentFinder = new ExternalDocumentsFinder(ctx.schemaFile.getAbsolutePath() ?? '', ctx.schemaFile.asObject());
    const resolver = documentFinder.create();
    const parser = new OpenApiJsonSchemaParser(resolver, ctx.parserOptions, ctx.schemaFile);
    const root = ctx.schemaFile.asObject<OpenAPIV3_1.Document>();
    const model = parser.parse(root);

    return {
      ...ctx,
      source: 'openapi',
      model: model,
    } as const;
  },
);

export default PluginAutoRegistry.register([OpenApiPlugin]);
