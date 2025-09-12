import {describe, test} from 'vitest';
import fs from 'fs';
import {Util} from '@omnigen/core';
import {DefaultOpenApiVisitor, OpenApiVisitor} from './OpenApiJsonSchemaParser.ts';
import * as YAML from 'yaml';
import {OpenAPIV3_1} from 'openapi-types';
import {TestUtils} from '@omnigen/utils-test';

describe('OpenApi Parser', () => {

  test('unchanged', async ctx => {

    const content = YAML.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-openapi/examples/petstore.yaml')).toString('utf-8'));
    const visited = DefaultOpenApiVisitor.openapi_document(content, DefaultOpenApiVisitor);

    ctx.expect(JSON.stringify(visited)).toEqual(JSON.stringify(content));
  });

  test('count', async ctx => {
    const content = YAML.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-openapi/examples/petstore.yaml')).toString('utf-8'));

    let callCount = 0;
    const visitor: OpenApiVisitor<OpenAPIV3_1.Document> = {
      ...DefaultOpenApiVisitor,
      maximum: v => {
        if (v) {
          callCount++;
        }
        return v;
      },
    };

    // TODO: Also visit an OpenApi-specific node for its version of `schema` -- like `discriminator`

    visitor.openapi_document(content, visitor);
    ctx.expect(callCount).toEqual(1);
  });

  test('alter', async ctx => {
    const content = YAML.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-openapi/examples/petstore.yaml')).toString('utf-8'));
    const visitor: OpenApiVisitor<OpenAPIV3_1.Document> = {
      ...DefaultOpenApiVisitor,
      maximum: v => (v ? v * 2 : v),
    };

    const visited = visitor.openapi_document(content, visitor);

    await ctx.expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(TestUtils.getSnapshotFileName(ctx));
  });
});
