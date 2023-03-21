import {expect, test} from '@jest/globals';
import {PipelineFactory} from './PluginManager';
import {LoggerFactory} from '@omnigen/core-log';
import {DEFAULT_PARSER_OPTIONS, DEFAULT_TARGET_OPTIONS, ParserOptions, RealOptions} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

test('Run Through Pipeline Builder', async () => {

  expect(1).toEqual(1);

  const builder = new PipelineFactory().create(() => ({
    input: ['a'],
    types: ['java'],
    output: 'somewhere',
  }));

  const builderWithInput = builder
    .from(a => {
      return {
        absolutePath: `${a.run.input[0]}-path`,
        contentString: `${a.run.types[0]}-content`,
      };
    });

  const res1 = builderWithInput.build();

  expect(res1.run).toBeDefined();
  expect(res1.input).toBeDefined();
  expect(res1.input.absolutePath).toEqual('a-path');
  expect(res1.input.contentString).toEqual('java-content');

  const builderWithModel = builderWithInput
    .thenDeserialize(a => {
      return `deserialized-${a.input.absolutePath}`;
    })
    .thenParseOptions(() => {
      return DEFAULT_PARSER_OPTIONS;
    })
    .thenParseOptionsDefaultResolver()
    // .thenParseOptionsResolver(a => {
    //
    //   return DEFAULT_PARSER_OPTIONS;
    // })
    .thenParse(a => {
      return {
        name: `${a.options.trustedClients}`,
        types: [],
        contact: undefined,
        continuations: [],
        endpoints: [],
        license: undefined,
        externalDocumentations: [],
        servers: [],
        schemaType: 'other',
        schemaVersion: '1.0',
        version: '1.0',
        termsOfService: 'MIT',
      };
    });

  const res2 = builderWithModel.build();

  // Should get the "same" content, but should be created again from the ground up.
  expect(res2.run).toBeDefined();
  expect(res2.input).toBeDefined();
  expect(res2.input.absolutePath).toEqual('a-path');
  expect(res2.input.contentString).toEqual('java-content');

  // So the identities should not be the same.
  expect(res2.run).not.toBe(res1.run);
  expect(res2.input).not.toBe(res1.input);

  const builderWithAll = builderWithModel
    .withModelTransformer(a => {

    })
    .withModelTransformer(a => {

    })
    .thenParseTargetOptions(a => {
      return {...a.options, ...DEFAULT_TARGET_OPTIONS};
    })
    .resolveTargetOptionsDefault()
    .thenInterpret(a => {
      return {
        visit: visitor => {

        },
      };
    })
    .withModelTransformer2(a => {

    })
    .withAstTransformer(a => {

    })
    .thenRender(a => {
      return {
        getFileNames: () => [],
        getFileContent: fileName => `${a.options.allowCompressInterfaceToInner}`,
      };
    })
    .thenWrite(a => {
      console.log(`We write`);
    });

  const all = builderWithAll.build();

  expect(all.rendered).toBeDefined();
  expect(all.options.compressSoloReferencedTypes).toEqual(DEFAULT_TARGET_OPTIONS.compressSoloReferencedTypes);
});
