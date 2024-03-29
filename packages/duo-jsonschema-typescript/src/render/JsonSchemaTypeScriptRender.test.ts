import {describe, expect, test, vi} from 'vitest';
import {Util} from '@omnigen/core-util';
import {JsonSchemaToTypeScriptTestUtil} from './JsonSchemaToTypeScriptTestUtil.ts';
import {RenderedCompilationUnit} from '@omnigen/core';

describe('jsonschema-typescript-render', () => {

  test('discriminator', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/duo-jsonschema-java/examples/discriminator.json'), {
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
    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/duo-jsonschema-typescript/examples/jsonschema-draft-07.json'), {
      strictUndefined: false,
      includeGenerated: false,
    });
    const fileContents = getFileContents(rendered);

    expect(Object.keys(fileContents).sort()).toMatchSnapshot();
    for (const [fileName, content] of Object.entries(fileContents)) {
      await expect(content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('jsonschema7-strict-undefined', async ({task}) => {

    // TODO: Make sure this works properly -- UNTESTED!
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // https://json-schema.org/draft-07/schema
    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/duo-jsonschema-typescript/examples/jsonschema-draft-07.json'), {
      strictUndefined: true,
      includeGenerated: false,
    });
    const fileContents = getFileContents(rendered);

    expect(Object.keys(fileContents).sort()).toMatchSnapshot();
    for (const [fileName, content] of Object.entries(fileContents)) {
      await expect(content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
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
