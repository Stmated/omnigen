import {describe, expect, test, vi} from 'vitest';
import {JsonSchemaToJavaTestUtil} from './JsonSchemaToJavaTestUtil.ts';
import {IncludeExampleCommentsMode, SerializationLibrary, ZodJavaOptions} from '@omnigen/target-java';
import {Util} from '@omnigen/core-util';

describe('jsonschema-java-render', () => {

  test('string_union', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/string_union.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu).toHaveLength(1);
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('x-enum-varnames', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/keep_x_enum_varnames.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('decorated_types', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(
      Util.getPathFromRoot('./packages/parser-jsonschema/examples/decorated_types.json'),
      {...ZodJavaOptions.parse({}), commentsOnFields: false, commentsOnGetters: true, serializationLibrary: SerializationLibrary.POJO, compressSoloReferencedTypes: false},
    );
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('enum_string_composition', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/enum_string_composition.json'), {
      compressSoloReferencedTypes: false,
      serializationLibrary: SerializationLibrary.POJO,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('interface_order', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/interface_order.json'), {
      compressSoloReferencedTypes: false,
      // serializationLibrary: 'POJO',
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('inline_boolean', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/inline_boolean.json'), {
      serializationLibrary: SerializationLibrary.POJO,
      includeExampleCommentsMode: IncludeExampleCommentsMode.SKIP,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('class_union', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/class_union.json'), {
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
      serializationLibrary: SerializationLibrary.JACKSON,
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

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/enum_inheritance.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('one_of_same_type', async ({task}) => {

    // TODO: Fix so that it either prints it as a String, or creates a composition type -- right now it tries to print the *object* DateOfBirthOrOrganization
    //        Something is likely wrong with some asSuperType/asSubType after type guard changes

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/one_of_same_type.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('discriminator', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/discriminator.json'));
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });
});
