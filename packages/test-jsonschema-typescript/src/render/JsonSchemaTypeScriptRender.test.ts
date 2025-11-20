import {describe, test, vi} from 'vitest';
import {Util} from '@omnigen/core';
import {JsonSchemaToTypeScriptTestUtil} from './JsonSchemaToTypeScriptTestUtil';
import {RenderedCompilationUnit} from '@omnigen/api';
import {TestUtils} from '@omnigen/utils-test';

describe('jsonschema-typescript-render', () => {

  test('discriminator', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/discriminator.json'), {
      singleFile: false,
      relaxedInspection: false,
    });
    const fileContents = getFileContents(rendered);

    ctx.expect(Object.keys(fileContents).sort()).toMatchSnapshot();
    for (const [fileName, content] of Object.entries(fileContents)) {
      await ctx.expect(content).toMatchFileSnapshot(TestUtils.getSnapshotFileName(ctx, fileName));
    }
  });

  test('jsonschema7-lax-undefined', async ctx => {

    // vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // https://json-schema.org/draft-07/schema
    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/test-jsonschema-typescript/examples/jsonschema-draft-07.json'), {
      strictUndefined: false,
      includeGenerated: false,
      singleFileName: 'Schema',
      relaxedInspection: false,
      defaultValueCommentsOnFields: false,
      debug: false,
    });
    const fileContents = getFileContents(rendered);

    ctx.expect(Object.keys(fileContents).sort()).toMatchSnapshot();
    for (const [fileName, content] of Object.entries(fileContents)) {
      await ctx.expect(content).toMatchFileSnapshot(TestUtils.getSnapshotFileName(ctx, fileName));
    }
  }, {timeout: 120_000});

  test('output-without-package', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.001Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/test-jsonschema-typescript/examples/jsonschema-draft-07.json'), {
      strictUndefined: false,
      includeGenerated: false,
      singleFileName: 'Schema',
      relaxedInspection: false,
      package: '',
    });

    const fileContents = getFileContents(rendered);
    const fileNames = Object.keys(fileContents).sort();

    ctx.expect(fileNames).toHaveLength(1);
    ctx.expect(fileNames[0]).toEqual('Schema.ts');
  });

  test('jsonschema7-strict-undefined', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    // https://json-schema.org/draft-07/schema
    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/test-jsonschema-typescript/examples/jsonschema-draft-07.json'), {
      strictUndefined: true,
      includeGenerated: false,
      singleFileName: 'Schema',
      relaxedInspection: false,
      defaultValueCommentsOnFields: false,
    });
    const fileContents = getFileContents(rendered);

    ctx.expect(Object.keys(fileContents).sort()).toMatchSnapshot();
    for (const [fileName, content] of Object.entries(fileContents)) {
      await ctx.expect(content).toMatchFileSnapshot(TestUtils.getSnapshotFileName(ctx, fileName));
    }
  });

  test('dynamic-ref', async ctx => {

    // TODO: This is not correct, dynamicRef and dynamicAnchor is not supported yet, but at least outputs *something*.
    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/dynamic_ref.json'), {
      includeGenerated: false,
      singleFile: true,
      relaxedInspection: false,
    });
    const fileContents = getFileContents(rendered);
    const keys = Object.keys(fileContents);
    await ctx.expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  // TODO: Add support for multiple files for $dynamicRef! What needs to be done is send around a `DocumentStore` instead of a `SchemaFile` everywhere, and make one `SchemaFile` "primary"
  // TODO: Rewrite the ExternalDocumentsFinder to take no main schemaFile, and instead it has a function that can take many files and process them
  // test('dynamic-ref-multiple-files', async ctx => {
  //
  //   // TODO: This is not correct, dynamicRef and dynamicAnchor is not supported yet, but at least outputs *something*.
  //   vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});
  //
  //   const rendered = await JsonSchemaToTypeScriptTestUtil.render([
  //     Util.getPathFromRoot('./packages/parser-jsonschema/examples/dynamic_ref.json'),
  //     Util.getPathFromRoot('./packages/parser-jsonschema/examples/dynamic_ref_leaf_boolean.json'),
  //   ], {
  //     includeGenerated: false,
  //     singleFile: true,
  //     relaxedInspection: false,
  //   });
  //   const fileContents = getFileContents(rendered);
  //   const keys = Object.keys(fileContents);
  //   await ctx.expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  // });

  /**
   * NOTE: This is in essence very wrong, but there are no compiler errors. There are lots of JSONSchema functionality inside that is not yet supported:
   *        * dependentSchemas
   *        * if, then, else
   *        * anyOf: [{required: [...]}, {required: [...]}]
   *        * $dynamicRef
   *        * $dynamicAnchor
   *
   * TODO: Currently incorrect output -- it refers to types that does not exist, like `SpecificationExtensions`. Something is wrong and needs narrower test cases.
   */
  test('openapi', async ctx => {

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-openapi/schemas/openapi-v31.json'), {
      includeGenerated: false,
      singleFile: true,
      relaxedInspection: false,
      debug: false,
      elevateProperties: false, // Do not elevate, since schema is quite complex.
    });
    const fileContents = getFileContents(rendered);
    const keys = Object.keys(fileContents);
    await ctx.expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  }, {timeout: 120_000});

  test('openapi-no-merge-mixed-ref', async ctx => {

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-openapi/schemas/openapi-v31.json'), {
      includeGenerated: false,
      singleFile: true,
      relaxedInspection: false,
      debug: false,
      elevateProperties: false, // Do not elevate, since schema is quite complex.
      mergeMixedReferences: false, // Do not merge mixed references, will keep more SpecificationExtensions around.
    });
    const fileContents = getFileContents(rendered);
    const keys = Object.keys(fileContents);
    await ctx.expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  }, {timeout: 120_000});

  test('if-then-else', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/if-then-else.json'), {
      includeGenerated: false,
      singleFile: true,
      orderObjectsByName: true,
      orderObjectsByDependency: false,
      relaxedInspection: false,
    });
    const fileContents = getFileContents(rendered);
    const keys = Object.keys(fileContents);
    await ctx.expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });

  test('additionalproperties-inheritance', async ctx => {

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const rendered = await JsonSchemaToTypeScriptTestUtil.render(Util.getPathFromRoot('./packages/parser-jsonschema/examples/additionalproperties-inheritance.json'), {
      includeGenerated: false,
      singleFile: true,
      elevateProperties: false,
      orderObjectsByDependency: true,
      preferInterfaces: true,
      immutable: false,
      singleFileName: 'Models',
      shortenNestedTypeNames: true,
      commentsOnFields: true,
      compressSoloReferencedTypes: false,
      anyAllowed: false,
    });
    const fileContents = getFileContents(rendered);
    const keys = Object.keys(fileContents);
    await ctx.expect(fileContents[keys[0]]).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.ts`);
  });
});

function getFileContents(cus: RenderedCompilationUnit[]): Record<string, string> {

  const result: Record<string, string> = {};

  const fileContents = Map.groupBy(cus, it => it.fileName);
  for (const file of fileContents) {
    result[file[0]] = file[1][0].content;
  }

  return result;
}
