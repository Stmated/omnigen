import {
  DEFAULT_PACKAGE_OPTIONS, OmniItemKind,
  OmniModel,
  ZodModelTransformOptions,
  ZodParserOptions,
  ZodTargetOptions,
} from '@omnigen/api';
import {
  BaseContext,
  createPlugin,
  ZodBaseContext,
  ZodTargetContext,
} from '@omnigen/core-plugin';
import {JAVA_FEATURES, JavaPlugins, ZodJavaOptions} from './index';
import {PluginManager} from '@omnigen/plugin';
import {test} from 'vitest';
import {z} from 'zod';
import {ZodJavaContextIn} from './JavaPluginInit.ts';

const createEmptyOmniModel = (name: string): OmniModel => {

  return {
    kind: OmniItemKind.MODEL,
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

    const currentArguments = {...ctx.defaults, ...ctx.arguments};
    return {
      ...ctx,
      target: 'java',
      model: createEmptyOmniModel('fake'),
      parserOptions: ZodParserOptions.parse(currentArguments),
      modelTransformOptions: ZodModelTransformOptions.parse(currentArguments),
      packageOptions: DEFAULT_PACKAGE_OPTIONS,
      targetOptions: ZodTargetOptions.parse({}),
      javaOptions: ZodJavaOptions.parse({}),
      targetFeatures: JAVA_FEATURES,
    } as const;
  });

test.concurrent('Java Plugin Hooks', async ctx => {

  const manager = new PluginManager({includeAuto: false});
  manager.addPlugin(JavaPlugins.default);
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

  ctx.expect(executions.result.ctx).toHaveProperty('renderers');
});

