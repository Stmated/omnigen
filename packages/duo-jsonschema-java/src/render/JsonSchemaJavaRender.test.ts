import {describe, test, expect, vi} from 'vitest';
import {JsonSchemaToJavaTestUtil} from './JsonSchemaToJavaTestUtil.ts';
import {ZodJavaOptions} from '@omnigen/target-java';

describe('jsonschema-java-render', () => {

  test('string_union', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render('./examples/string_union.json');
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu).toHaveLength(1);
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('x-enum-varnames', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render('../parser-jsonschema/examples/keep_x_enum_varnames.json', undefined);
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });

  test('decorated_types', async ({task}) => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(
      '../parser-jsonschema/examples/decorated_types.json',
      {...ZodJavaOptions.parse({}), commentsOnFields: false, commentsOnGetters: true},
    );
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${task.suite.name}/${task.name}/${fileName}`);
    }
  });
});
