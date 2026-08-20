import {describe, test, vi} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';
import {OpenRpcTypeScriptTestUtils} from '../utils/OpenRpcTypeScriptTestUtils';

const logger = LoggerFactory.create(import.meta.url);

describe('TypeScript Rendering', () => {

  test('Test multiple inheritance (interfaces)', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // TODO: Run this test case and make sure the correct generic arguments are added! I think the "problem" might be that it is elevated as a general property before we have time for generics
    //       This is because we now skip `hidden` properties, so we do not encounter the situation where we "add the same property twice" as was the start of this whole journey
    //       So figure out how to properly fix this -- most likely by never elevating the properties in this exact case (where the target can support literals, but we have not sealed it)
    //       Even better would be more test cases where we mix and match support for primitive literal types and `sealed`

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      options: {
        singleFile: true,
        jsonRpcResultRequired: false,
        relaxedInspection: false,
        includeGeneratedInFileHeader: false,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('SealedGenericUpperBound', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('multiple-inheritance.json', {
      options: {
        singleFile: true,
        jsonRpcResultRequired: false,
        relaxedInspection: false,
        includeGeneratedInFileHeader: false,
        sealedGenericUpperBounds: true,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('Type compressions', async ctx => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('compressable-types.json', {
      options: {
        generifyTypes: false,
        singleFile: true,
        includeGeneratedInFileHeader: false,
        immutable: true,
      },
    });

    const fileContent = fileContents.get([...fileContents.keys()][0]);
    await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
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
    await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
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
    await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
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
    await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
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
    await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('description-inheritance', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const fileContents = await OpenRpcTypeScriptTestUtils.getFileContentsFromFile('description-inheritance.json', {
      options: {
        singleFile: true,
        singleFileName: 'description-inheritance',
        immutable: true,
        commentsOnTypes: true, // TODO: This does not seem to work properly. The comments are lost on the transition to interfaces/advanced types
      },
    });

    for (const [fileName, fileContent] of fileContents) {
      await ctx.expect(fileContent).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${fileName}`);
    }
  });
});
