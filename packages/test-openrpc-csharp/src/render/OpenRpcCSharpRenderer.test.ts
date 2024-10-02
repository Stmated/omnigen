import {beforeEach, describe, TaskContext, TestContext, test, vi} from 'vitest';
import {LoggerFactory} from '@omnigen/core-log';
import {OpenRpcCSharpTestUtils} from '../OpenRpcCSharpTestUtils';
import {RenderedCompilationUnit} from '@omnigen/api';
import {ReadonlyPropertyMode} from '@omnigen/target-csharp';

const logger = LoggerFactory.create(import.meta.url);

describe('OpenRpc+CSharp Rendering', () => {

  beforeEach(() => {
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});
  });

  function verify(ctx: TaskContext & TestContext, units: RenderedCompilationUnit[]) {
    const fileContents = new Map<string, string>();
    for (const cu of units) {
      fileContents.set(cu.fileName, cu.content);
      ctx.expect(cu.content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${cu.fileName}`);
    }
    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
  }

  function getFileName(ctx: TaskContext & TestContext): string {

    const taskName = ctx.task.name;
    const underscoreIdx = taskName.indexOf('_');
    if (underscoreIdx === -1) {
      return `${taskName}.json`;
    } else {
      return `${taskName.substring(0, underscoreIdx)}.json`;
    }
  }

  test('multiple-inheritance', async ctx => verify(ctx, await OpenRpcCSharpTestUtils.render(getFileName(ctx), {
    singleFile: true,
    singleFileName: ctx.task.name,
    orderObjectsByDependency: true,
    jsonRpcResultRequired: false,
    includeGeneratedInFileHeader: false,
    serializationEnsureRequiredFieldExistence: false,
  })));

  test('compressable-types', async ctx => verify(ctx, await OpenRpcCSharpTestUtils.render(getFileName(ctx), {
    generifyTypes: false,
    singleFile: true,
    singleFileName: ctx.task.name,
    orderObjectsByName: true,
    orderObjectsByDependency: false,
    jsonRpcResultRequired: false,
    includeGeneratedInFileHeader: false,
  })));

  test('inherited-construction_no_init', async ctx => verify(ctx, await OpenRpcCSharpTestUtils.render(getFileName(ctx), {
    singleFile: true,
    singleFileName: ctx.task.name,
    csharpReadonlyPropertySetterMode: ReadonlyPropertyMode.NO_SETTER,
    jsonRpcResultRequired: false,
    includeGeneratedInFileHeader: false,
    serializationEnsureRequiredFieldExistence: false,
  })));

  test('inherited-construction', async ctx => verify(ctx, await OpenRpcCSharpTestUtils.render(getFileName(ctx), {
    singleFile: true,
    singleFileName: ctx.task.name,
    csharpReadonlyPropertySetterMode: ReadonlyPropertyMode.INIT,
    orderObjectsByDependency: true,
    includeGeneratedInFileHeader: false,
    serializationEnsureRequiredFieldExistence: false,
  })));

  test('enum', async ctx => verify(ctx, await OpenRpcCSharpTestUtils.render(getFileName(ctx), {
    singleFile: true,
    singleFileName: ctx.task.name,
    includeGenerated: false,
    orderObjectsByDependency: true,
    serializationEnsureRequiredFieldExistence: false,
  })));

  // test('sui-openrpc', async ctx => verify(task, await OpenRpcCSharpTestUtils.render(getFileName(task), {
  //   singleFile: true,
  //   includeGenerated: false,
  //   csharpReadonlyPropertySetterMode: 'INIT',
  //   commentsOnConstructors: false,
  //   commentsOnFields: false,
  //   commentsOnGetters: false,
  //   commentsOnTypes: false,
  //   singleFileName: 'sui',
  // })));

  test('additional-properties', async ctx => verify(ctx, await OpenRpcCSharpTestUtils.render(getFileName(ctx), {
    additionalPropertiesInterfaceAfterDuplicateCount: 1,
    singleFile: true,
    singleFileName: ctx.task.name,
    orderObjectsByDependency: true,
    includeGeneratedInFileHeader: false,
    serializationEnsureRequiredFieldExistence: false,
  })));

  test('method-in-response', async ctx => verify(ctx, await OpenRpcCSharpTestUtils.render(getFileName(ctx), {
    singleFile: true,
    singleFileName: ctx.task.name,
    orderObjectsByDependency: true,
    includeGeneratedInFileHeader: false,
    serializationEnsureRequiredFieldExistence: false,
  })));
});
