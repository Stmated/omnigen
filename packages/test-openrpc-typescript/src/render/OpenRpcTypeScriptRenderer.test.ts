import {describe, expect, test, vi} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';
import {OpenRpcTypeScriptTestUtils} from '../utils/OpenRpcTypeScriptTestUtils.ts';

const logger = LoggerFactory.create(import.meta.url);

describe('TypeScript Rendering', () => {

  test('Test multiple inheritance (interfaces)', async ({task}) => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      options: {
        singleFile: true,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}.ts`);
  });

  test('Type compressions', async ({task}) => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // TODO: This must pass when all other have been fixed!

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('compressable-types.json', {
      options: {
        generifyTypes: false,
        singleFile: true,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}.ts`);
  });

  test('compressable-types_classes', async ({task}) => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('compressable-types.json', {
      options: {
        singleFile: true,
        preferInterfaces: false,
        strictUndefined: true,
        orderObjectsByDependency: true,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}.ts`);
  });

  test('Enum', async ({task}) => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('enum.json', {
      options: {
        singleFile: true,
      },
      arguments: {
        includeGenerated: 'false',
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}.ts`);
  });

  test('AdditionalProperties', async ({task}) => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('additional-properties.json', {
      options: {
        additionalPropertiesInterfaceAfterDuplicateCount: 1,
        singleFile: true,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}.ts`);
  });

  test('method-in-response', async ({task}) => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('method-in-response.json', {
      options: {
        preferInterfaces: true,
        singleFile: true,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${task.suite?.name}/${task.name}.ts`);
  });
});
