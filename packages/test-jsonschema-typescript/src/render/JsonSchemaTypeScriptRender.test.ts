import {describe, expect, test, vi} from 'vitest';
import {Util} from '@omnigen/core';
import {JsonSchemaToTypeScriptTestUtil} from './JsonSchemaToTypeScriptTestUtil.ts';
import {RenderedCompilationUnit} from '@omnigen/api';

describe('jsonschema-typescript-render', () => {

  test('discriminator', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/discriminator.json'), {
      singleFile: false,
    });
    const fileContents = getFileContents(rendered);

    expect(Object.keys(fileContents).sort()).toMatchSnapshot();
    for (const [fileName, content] of Object.entries(fileContents)) {
      expect(content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('jsonschema7-lax-undefined', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // https://json-schema.org/draft-07/schema
    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/test-jsonschema-typescript/examples/jsonschema-draft-07.json'), {
      strictUndefined: false,
      includeGenerated: false,
      singleFileName: 'Schema',
    });
    const fileContents = getFileContents(rendered);

    expect(Object.keys(fileContents).sort()).toMatchSnapshot();
    for (const [fileName, content] of Object.entries(fileContents)) {
      await expect(content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('jsonschema7-strict-undefined', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // https://json-schema.org/draft-07/schema
    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/test-jsonschema-typescript/examples/jsonschema-draft-07.json'), {
      strictUndefined: true,
      includeGenerated: false,
      singleFileName: 'Schema',
    });
    const fileContents = getFileContents(rendered);

    expect(Object.keys(fileContents).sort()).toMatchSnapshot();
    for (const [fileName, content] of Object.entries(fileContents)) {
      await expect(content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('dynamic-ref', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/dynamic_ref.json'), {
      includeGenerated: false,
      singleFile: true,
    });
    const fileContents = getFileContents(rendered);
    const keys = Object.keys(fileContents);
    await expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.ts`);
  });

  /**
   * NOTE: This is in essence very wrong, but there are no compiler errors. There are lots of JSONSchema functionality inside that is not yet supported:
   *        * dependentSchemas
   *        * if, then, else
   *        * anyOf: [{required: [...]}, {required: [...]}]
   *        * $dynamicRef
   *        * $dynamicAnchor
   *
   * TODO: Currently incorrect output -- it refers to types that does not exist, like `SpecificationExtensions`. Something is wrong and needs narrower test cases.
   */
  test('openapi', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-openapi/schemas/openapi-v31.json'), {
      includeGenerated: false,
      singleFile: true,
    });
    const fileContents = getFileContents(rendered);
    const keys = Object.keys(fileContents);
    await expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.ts`);
  });

  test('if-then-else', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/if-then-else.json'), {
      includeGenerated: false,
      singleFile: true,
    });
    const fileContents = getFileContents(rendered);
    const keys = Object.keys(fileContents);
    await expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}.ts`);
  });
});

function getFileContents(cus: RenderedCompilationUnit[]): Record<string, string> {

  const result: Record<string, string> = {};

  const fileContents = Map.groupBy(cus, it => it.fileName);
  for (const file of fileContents) {
    result[file[0]] = file[1][0].content;
  }

  return result;
}
