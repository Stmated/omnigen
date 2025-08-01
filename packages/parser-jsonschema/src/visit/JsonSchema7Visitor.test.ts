import {describe, test} from 'vitest';
import {DefaultJsonSchema9Visitor} from './DefaultJsonSchema9Visitor';
import * as fs from 'fs';
import {JsonSchema9Visitor} from './JsonSchema9Visitor';
import {ApplyIdJsonSchemaTransformerFactory, SimplifyJsonSchemaTransformerFactory} from '../transform';
import {z} from 'zod';
import {SchemaFile, Util} from '@omnigen/core';
import {JSONSchema9Definition} from '../definitions';
import {JsonSchemaMigrator} from '../migrate';
import {TestUtils} from '@omnigen/utils-test';

describe('jsonschema-7-visit', () => {
  test('unchanged', async ctx => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet.json')).toString('utf-8'));
    const visited = DefaultJsonSchema9Visitor.visit(content, DefaultJsonSchema9Visitor);

    ctx.expect(JSON.stringify(visited)).toEqual(JSON.stringify(content));
  });

  test('count', async ctx => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet.json')).toString('utf-8'));

    let callCount = 0;
    const visitor: JsonSchema9Visitor = {
      ...DefaultJsonSchema9Visitor,
      maximum: v => {
        if (v) {
          callCount++;
        }
        return v;
      },
    };

    visitor.visit(content, visitor);
    ctx.expect(callCount).toEqual(2);
  });

  test('alter_maximum', async ctx => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet.json')).toString('utf-8'));
    const visitor: JsonSchema9Visitor = {
      ...DefaultJsonSchema9Visitor,
      maximum: v => (v ? v * 2 : v),
    };

    const visited = visitor.visit(content, visitor);

    await ctx.expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('remove_descriptions', async ctx => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet.json')).toString('utf-8'));
    const visitor: JsonSchema9Visitor = {
      ...DefaultJsonSchema9Visitor,
      description: () => undefined,
    };

    const visited = visitor.visit(content, visitor);

    await ctx.expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  // test('normalize_defs', async ctx => {
  //   const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet_defs_and_definitions.json')).toString('utf-8'));
  //   // const visitor = new NormalizeDefsJsonSchemaTransformerFactory().create();
  //   let visited = content;
  //   visited = new JsonSchemaMigrator().migrate(visited);
  //   // visited = visitor.visit(content, visitor);
  //
  //   await ctx.expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite.name}/${ctx.task.name}.json`);
  // });

  test('keep_enum_var_names', async ctx => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/keep_x_enum_varnames.json')).toString('utf-8'));
    const visitors = [new SimplifyJsonSchemaTransformerFactory().create()];

    let visited = content;
    visited = new JsonSchemaMigrator().migrate(visited);
    for (const visitor of visitors) {
      visited = visitor.visit(content, visitor);
    }

    ctx.expect(JSON.stringify(visited)).toEqual(JSON.stringify(content));
  });

  test('visit_into_unknown_without_redirect', async ctx => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/visit_unknown_properties.json')).toString('utf-8'));
    const visitor: JsonSchema9Visitor = {
      ...DefaultJsonSchema9Visitor,
      $ref: v => (v ? v.replace(`$defs/B`, '$defs/C') : v),
    };

    const visited = visitor.visit(content, visitor);

    await ctx.expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('visit_into_unknown_with_redirect', async ctx => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/visit_unknown_properties.json')).toString('utf-8'));
    const visitor: JsonSchema9Visitor = {
      ...DefaultJsonSchema9Visitor,
      $ref: v => (v ? v.replace(`$defs/B`, '$defs/C') : v),
      format: v => (v === 'double' ? 'triple' : v),
      visit_unknown: (v, visitor) => {
        if (v.path[v.path.length - 1] == 'x-format') {
          const transformed = visitor.format(z.coerce.string().parse(v.value), visitor);
          if (transformed === undefined) {
            return transformed;
          }
          return {...v, value: transformed};
        } else {
          return DefaultJsonSchema9Visitor.visit_unknown(v, visitor);
        }
      },
    };

    const visited = visitor.visit(content, visitor);

    await ctx.expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('normalize_ids', async ctx => {
    const schemaFile = new SchemaFile(Util.getPathFromRoot('./packages/parser-jsonschema/examples/needs_absolute_ids.json'));
    const schemaContent = schemaFile.asObject<JSONSchema9Definition>();

    // Set custom path resolver, otherwise we will get absolute path inside our snapshot
    const visitor = new ApplyIdJsonSchemaTransformerFactory().create();
    const visited = visitor.visit(schemaContent, visitor);

    // `./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`
    await ctx.expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(TestUtils.getSnapshotFileName(ctx));
  });
});
