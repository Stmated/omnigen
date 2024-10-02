import {describe, test, vi} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';
import {OpenRpcTypeScriptTestUtils} from '../utils/OpenRpcTypeScriptTestUtils';

const logger = LoggerFactory.create(import.meta.url);

describe('TypeScript Rendering', () => {

  test('Test multiple inheritance (interfaces)', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      options: {
        singleFile: true,
        jsonRpcResultRequired: false,
        relaxedInspection: false,
        includeGeneratedInFileHeader: false,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('Type compressions', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // TODO: This must pass when all other have been fixed!

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('compressable-types.json', {
      options: {
        generifyTypes: false,
        singleFile: true,
        includeGeneratedInFileHeader: false,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('compressable-types_classes', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('compressable-types.json', {
      options: {
        singleFile: true,
        preferInterfaces: false,
        strictUndefined: true,
        orderObjectsByDependency: true,
        includeGeneratedInFileHeader: false,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('Enum', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('enum.json', {
      options: {
        singleFile: true,
        relaxedInspection: false,
        jsonRpcResultRequired: false,
        anyAllowed: true,
      },
      arguments: {
        includeGenerated: 'false',
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('AdditionalProperties', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('additional-properties.json', {
      options: {
        additionalPropertiesInterfaceAfterDuplicateCount: 1,
        singleFile: true,
        includeGeneratedInFileHeader: false,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('method-in-response', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('method-in-response.json', {
      options: {
        preferInterfaces: true,
        singleFile: true,
        anyAllowed: false,
        relaxedInspection: false,
        includeGeneratedInFileHeader: false,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });
});
