import {describe, test, vi} from 'vitest';
import {JsonSchemaToJavaTestUtil} from './JsonSchemaToJavaTestUtil';
import {SerializationLibrary} from '@omnigen/target-java';
import {Util} from '@omnigen/core';
import {IncludeExampleCommentsMode} from '@omnigen/target-code';
import {LoggerFactory} from '@omnigen/core-log';

describe('jsonschema-java-render', () => {

  test('string_union', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/string_union.json'), {
      serializationLibrary: SerializationLibrary.JACKSON,
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

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/keep_x_enum_varnames.json'), {
      serializationLibrary: SerializationLibrary.JACKSON,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('decorated_types', async ctx => {

    // TODO: Fix so that the "default value" ternary expression is not added if the Direction is `in` or something similar -- non-nullable boolean can never be null

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/decorated_types.json'), {
      commentsOnFields: false,
      commentsOnGetters: true,
      serializationLibrary: SerializationLibrary.POJO,
      compressSoloReferencedTypes: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('enum_string_composition', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/enum_string_composition.json'), {
      compressSoloReferencedTypes: false,
      serializationLibrary: SerializationLibrary.POJO,
      beanValidation: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('interface_order', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/interface_order.json'), {
      compressSoloReferencedTypes: false,
      beanValidation: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('inline_boolean', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/inline_boolean.json'), {
      serializationLibrary: SerializationLibrary.POJO,
      includeExampleCommentsMode: IncludeExampleCommentsMode.SKIP,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('class_union', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/class_union.json'), {
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
      serializationLibrary: SerializationLibrary.JACKSON,
      includeExampleCommentsMode: IncludeExampleCommentsMode.SKIP,
      beanValidation: false,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('enum_inheritance', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/enum_inheritance.json'), {
      serializationLibrary: SerializationLibrary.JACKSON,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('one_of_same_type', async ctx => {

    // TODO: Fix so that it either prints it as a String, or creates a composition type -- right now it tries to print the *object* DateOfBirthOrOrganization
    //        Something is likely wrong with some asSuperType/asSubType after type guard changes

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/one_of_same_type.json'), {
      serializationLibrary: SerializationLibrary.JACKSON,
      beanValidation: false,
      compressUnreferencedSubTypes: true,
      compressSoloReferencedTypes: true,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('discriminator', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/discriminator.json'), {
      serializationLibrary: SerializationLibrary.JACKSON,
      beanValidation: false,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('3-generic', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToJavaTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/3_step_generic.json'), {
      beanValidation: false,
      singleFile: true,
      singleFileName: ctx.task.name,
      serializationLibrary: SerializationLibrary.POJO,
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
      lombokGetter: true,
    });
    const fileContents = Map.groupBy(rendered, it => it.fileName);

    ctx.expect([...fileContents.keys()].sort()).toMatchSnapshot();
    for (const [fileName, cu] of fileContents) {
      await ctx.expect(cu[0].content).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}/${fileName}`);
    }
  });

  test('logging', () => {


    const logger = LoggerFactory.create('SomeLogger');

    logger.info(`A message`);
    logger.info(`A message with error`, new Error(`Some thrown error`));
    logger.info(`A message with error and cause`, new Error(`Some thrown error`, {cause: new Error(`The cause!`)}));

    logger.error(`An error message`);
    logger.error(`An error message with error`, new Error(`Some thrown error`));
    logger.error(`An error message with error and cause`, new Error(`Some thrown error`, {cause: new Error(`The cause!`)}));
  });
});
