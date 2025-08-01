import {describe, test, vi} from 'vitest';
import {JsonSchemaToCSharpTestUtil} from './JsonSchemaToCSharpTestUtil';
import {Util} from '@omnigen/core';
import {SerializationLibrary} from '@omnigen/target-csharp';
import {IncludeExampleCommentsMode, PropertyTypeCommentMode} from '@omnigen/target-code';

describe('jsonschema-csharp-render', () => {

  test('string_union', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/string_union.json'), {
      includeGeneratedInFileHeader: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      ctx.expect(cu).toHaveLength(1);
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('x-enum-varnames', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/keep_x_enum_varnames.json'), {
      includeGeneratedInFileHeader: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('decorated_types', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/decorated_types.json'), {
      compressSoloReferencedTypes: false,
      includeGeneratedInFileHeader: false,
      serializationEnsureRequiredFieldExistence: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('enum_string_composition', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/enum_string_composition.json'), {
      compressSoloReferencedTypes: false,
      typeCommentsOnProperties: PropertyTypeCommentMode.ALWAYS,
      includeGeneratedInFileHeader: false,
      serializationEnsureRequiredFieldExistence: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('interface_order', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/interface_order.json'), {
      compressSoloReferencedTypes: false,
      serializationLibrary: SerializationLibrary.NONE,
      includeGeneratedInFileHeader: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('inline_boolean', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/inline_boolean.json'), {
      serializationLibrary: SerializationLibrary.NONE,
      includeExampleCommentsMode: IncludeExampleCommentsMode.SKIP,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
      singleFile: false,
      includeGeneratedInFileHeader: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('class_union', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/class_union.json'), {
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
      serializationLibrary: SerializationLibrary.NEWTONSOFT,
      includeExampleCommentsMode: IncludeExampleCommentsMode.SKIP,
      includeGeneratedInFileHeader: false,
      serializationEnsureRequiredFieldExistence: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('enum_inheritance', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/enum_inheritance.json'), {
      includeGeneratedInFileHeader: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('one_of_same_type', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/one_of_same_type.json'), {
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
      includeGeneratedInFileHeader: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('discriminator', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/discriminator.json'), {
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
      includeGeneratedInFileHeader: false,
      serializationEnsureRequiredFieldExistence: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });
});
