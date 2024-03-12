import {describe, expect, test} from 'vitest';
import {DefaultJsonSchema7Visitor} from './DefaultJsonSchema7Visitor.ts';
import * as fs from 'fs';
import {JsonSchema7Visitor} from './JsonSchema7Visitor.ts';
import {NormalizeDefsJsonSchemaTransformerFactory} from '../transform/NormalizeDefsJsonSchemaTransformerFactory.ts';
import {SimplifyJsonSchemaTransformerFactory} from '../transform/SimplifyJsonSchemaTransformerFactory.ts';
import {z} from 'zod';
import {ApplyIdJsonSchemaTransformerFactory} from '../transform/ApplyIdJsonSchemaTransformerFactory.ts';
import {SchemaFile, Util} from '@omnigen/core-util';
import {JSONSchema7Definition} from 'json-schema';

describe('jsonschema-7-visit', () => {
  test('unchanged', async () => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet.json')).toString('utf-8'));
    const visited = DefaultJsonSchema7Visitor.visit(content, DefaultJsonSchema7Visitor);

    expect(JSON.stringify(visited)).toEqual(JSON.stringify(content));
  });

  test('count', async () => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet.json')).toString('utf-8'));

    let callCount = 0;
    const visitor: JsonSchema7Visitor = {
      ...DefaultJsonSchema7Visitor,
      maximum: v => {
        if (v) {
          callCount++;
        }
        return v;
      },
    };

    visitor.visit(content, visitor);
    expect(callCount).toEqual(2);
  });

  test('alter_maximum', async ({task}) => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet.json')).toString('utf-8'));
    const visitor: JsonSchema7Visitor = {
      ...DefaultJsonSchema7Visitor,
      maximum: v => (v ? v * 2 : v),
    };

    const visited = visitor.visit(content, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });

  test('remove_descriptions', async ({task}) => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet.json')).toString('utf-8'));
    const visitor: JsonSchema7Visitor = {
      ...DefaultJsonSchema7Visitor,
      description: () => undefined,
    };

    const visited = visitor.visit(content, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });

  test('normalize_defs', async ({task}) => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/pet_defs_and_definitions.json')).toString('utf-8'));
    const visitor = new NormalizeDefsJsonSchemaTransformerFactory().create();
    const visited = visitor.visit(content, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });

  test('keep_enum_var_names', async ({task}) => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/keep_x_enum_varnames.json')).toString('utf-8'));
    const visitors = [new NormalizeDefsJsonSchemaTransformerFactory().create(), new SimplifyJsonSchemaTransformerFactory().create()];

    let visited = content;
    for (const visitor of visitors) {
      visited = visitor.visit(content, visitor);
    }

    expect(JSON.stringify(visited)).toEqual(JSON.stringify(content));
  });

  test('visit_into_unknown_without_redirect', async ({task}) => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/visit_unknown_properties.json')).toString('utf-8'));
    const visitor: JsonSchema7Visitor = {
      ...DefaultJsonSchema7Visitor,
      $ref: v => (v ? v.replace(`$defs/B`, '$defs/C') : v),
    };

    const visited = visitor.visit(content, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });

  test('visit_into_unknown_with_redirect', async ({task}) => {
    const content = JSON.parse(fs.readFileSync(Util.getPathFromRoot('./packages/parser-jsonschema/examples/visit_unknown_properties.json')).toString('utf-8'));
    const visitor: JsonSchema7Visitor = {
      ...DefaultJsonSchema7Visitor,
      $ref: v => (v ? v.replace(`$defs/B`, '$defs/C') : v),
      format: v => (v == 'double' ? 'triple' : v),
      visit_unknown: (v, visitor) => {
        if (v.path[v.path.length - 1] == 'x-format') {
          const transformed = visitor.format(z.coerce.string().parse(v.value), visitor);
          if (transformed === undefined) {
            return transformed;
          }
          return {...v, value: transformed};
        } else {
          return DefaultJsonSchema7Visitor.visit_unknown(v, visitor);
        }
      },
    };

    const visited = visitor.visit(content, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });

  test('normalize_ids', async ({task}) => {
    const schemaFile = new SchemaFile(Util.getPathFromRoot('./packages/parser-jsonschema/examples/needs_absolute_ids.json'));
    const schemaContent = await schemaFile.asObject<JSONSchema7Definition>();

    // Set custom path resolver, otherwise we will get absolute path inside our snapshot
    const visitor = new ApplyIdJsonSchemaTransformerFactory('/fake/path').create();
    const visited = visitor.visit(schemaContent, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });
});
