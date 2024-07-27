import {describe, expect, test, vi} from 'vitest';
import {JsonSchemaToCSharpTestUtil} from './JsonSchemaToCSharpTestUtil.ts';
import {Util} from '@omnigen/core-util';
import {SerializationLibrary} from '@omnigen/target-csharp';
import {IncludeExampleCommentsMode, PropertyTypeCommentMode} from '@omnigen/target-code';

describe('jsonschema-csharp-render', () => {

  test('string_union', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/string_union.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu).toHaveLength(1);
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('x-enum-varnames', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/keep_x_enum_varnames.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('decorated_types', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(
      Util.getPathFromRoot('./packages/parser-jsonschema/examples/decorated_types.json'),
      {
        compressSoloReferencedTypes: false,
      },
    );
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('enum_string_composition', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/enum_string_composition.json'), {
      compressSoloReferencedTypes: false,
      typeCommentsOnProperties: PropertyTypeCommentMode.ALWAYS,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('interface_order', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/interface_order.json'), {
      compressSoloReferencedTypes: false,
      serializationLibrary: SerializationLibrary.NONE,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('inline_boolean', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/inline_boolean.json'), {
      serializationLibrary: SerializationLibrary.NONE,
      includeExampleCommentsMode: IncludeExampleCommentsMode.SKIP,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
      singleFile: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('class_union', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/class_union.json'), {
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
      serializationLibrary: SerializationLibrary.NEWTONSOFT,
      includeExampleCommentsMode: IncludeExampleCommentsMode.SKIP,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('enum_inheritance', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/enum_inheritance.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('one_of_same_type', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/one_of_same_type.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('discriminator', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToCSharpTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/discriminator.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });
});
