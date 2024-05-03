import {beforeEach, describe, expect, test, Test, vi} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';
import {OpenRpcCSharpTestUtils} from '../OpenRpcCSharpTestUtils.ts';
import {RenderedCompilationUnit} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

describe('OpenRpc+CSharp Rendering', () => {

  beforeEach(() => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});
  });

  function verify(task: Test<{}>, units: RenderedCompilationUnit[]) {
    const fileContents = new Map<string, string>();
    for (const cu of units) {
      fileContents.set(cu.fileName, cu.content);
      expect(cu.content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${cu.fileName}`);
    }
    expect([...fileContents.keys()].sort()).toMatchSnapshot();
  }

  function getFileName(task: Test<{}>): string {

    const taskName = task.name;
    const underscoreIdx = taskName.indexOf('_');
    if (underscoreIdx === -1) {
      return `${taskName}.json`;
    } else {
      return `${taskName.substring(0, underscoreIdx)}.json`;
    }
  }

  test('multiple-inheritance', async ({task}) => verify(task, await OpenRpcCSharpTestUtils.render(getFileName(task), {
    singleFile: true,
  })));

  test('compressable-types', async ({task}) => verify(task, await OpenRpcCSharpTestUtils.render(getFileName(task), {
    generifyTypes: false,
    singleFile: true,
  })));

  test('enum', async ({task}) => verify(task, await OpenRpcCSharpTestUtils.render(getFileName(task), {
    singleFile: true,
    includeGenerated: false,
  })));

  test('additional-properties', async ({task}) => verify(task, await OpenRpcCSharpTestUtils.render(getFileName(task), {
    additionalPropertiesInterfaceAfterDuplicateCount: 1,
    singleFile: true,
  })));

  test('method-in-response', async ({task}) => verify(task, await OpenRpcCSharpTestUtils.render(getFileName(task), {
    // preferInterfaces: true,
    singleFile: true,
  })));
});
