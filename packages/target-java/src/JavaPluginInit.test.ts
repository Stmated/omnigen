import {
  DEFAULT_PACKAGE_OPTIONS,
  OmniModel,
  ZodModelTransformOptions,
  ZodParserOptions,
  ZodTargetOptions,
} from '@omnigen/core';
import {
  BaseContext,
  createPlugin,
  ZodBaseContext,
  ZodTargetContext,
} from '@omnigen/core-plugin';
import {JAVA_FEATURES, JavaBoot, ZodJavaOptions} from './index';
import {PluginManager} from '@omnigen/plugin';
import {test, expect} from 'vitest';
import {z} from 'zod';
import {ZodJavaContextIn} from './JavaPluginInit.ts';

const createEmptyOmniModel = (name: string): OmniModel => {

  return {
    name: `${name}`,
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
};

const fakePropertiesPlugin = createPlugin(
  {
    name: 'fake-properties',
    in: ZodBaseContext,
    out: ZodJavaContextIn,
  },
  async ctx => {

    return {
      ...ctx,
      target: 'java',
      model: createEmptyOmniModel('fake'),
      parserOptions: ZodParserOptions.parse(ctx.arguments),
      modelTransformOptions: ZodModelTransformOptions.parse(ctx.arguments),
      packageOptions: DEFAULT_PACKAGE_OPTIONS,
      targetOptions: ZodTargetOptions.parse({}),
      javaOptions: ZodJavaOptions.parse({}),
      targetFeatures: JAVA_FEATURES,
    } as const;
  });

test('Java Plugin Hooks', async () => {

  const manager = new PluginManager({includeAuto: false});
  manager.addPlugin(JavaBoot.default);
  manager.addPlugin([
    fakePropertiesPlugin,
  ]);

  const runOptions: BaseContext & z.output<typeof ZodTargetContext> = {
    arguments: {
      target: 'java',
    },
    target: 'java',
  };

  const executions = await manager.execute({
    ctx: runOptions,
  });

  expect(executions.result.ctx).toHaveProperty('renderers');
});

