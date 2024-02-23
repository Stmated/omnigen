import {describe, test, expect} from 'vitest';
import {DefaultJsonSchema7Visitor} from './DefaultJsonSchema7Visitor.ts';
import * as fs from 'fs';
import {JsonSchema7Visitor} from './JsonSchema7Visitor.ts';
import {NormalizeDefsJsonSchemaTransformerFactory} from '../transform/NormalizeDefsJsonSchemaTransformerFactory.ts';

describe('jsonschema-7-visit', () => {

  test('unchanged', async () => {

    const content = JSON.parse(fs.readFileSync('./examples/pet.json').toString('utf-8'));
    const visited = DefaultJsonSchema7Visitor.visit(content, DefaultJsonSchema7Visitor);

    expect(JSON.stringify(visited)).toEqual(JSON.stringify(content));
  });

  test('count', async () => {

    const content = JSON.parse(fs.readFileSync('./examples/pet.json').toString('utf-8'));

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

    const content = JSON.parse(fs.readFileSync('./examples/pet.json').toString('utf-8'));
    const visitor: JsonSchema7Visitor = {
      ...DefaultJsonSchema7Visitor,
      maximum: v => v ? v * 2 : v,
    };

    const visited = visitor.visit(content, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });

  test('remove_descriptions', async ({task}) => {

    const content = JSON.parse(fs.readFileSync('./examples/pet.json').toString('utf-8'));
    const visitor: JsonSchema7Visitor = {
      ...DefaultJsonSchema7Visitor,
      description: () => undefined,
    };

    const visited = visitor.visit(content, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });

  test('normalize_defs', async ({task}) => {

    const content = JSON.parse(fs.readFileSync('./examples/pet_defs_and_definitions.json').toString('utf-8'));
    const visitor = new NormalizeDefsJsonSchemaTransformerFactory().create();
    const visited = visitor.visit(content, visitor);

    expect(JSON.stringify(visited, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.json`);
  });
});
