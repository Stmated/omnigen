import {CompressTypeLevel, CompressTypeNaming, TargetOptions, ZodTargetOptions} from '@omnigen/api';
import {PluginManager} from './PluginManager';
import {z} from 'zod';
import {describe, test} from 'vitest';

describe('object conversions', () => {

  test('basic', ctx => {

    const values: Partial<Record<keyof TargetOptions, any>> = {
      compressSoloReferencedTypes: 'true',
      compressUnreferencedSubTypes: 1,
      allowCompressInterfaceToInner: false,
      additionalPropertiesInterfaceAfterDuplicateCount: 3,
      compressTypesLevel: 'FUNCTIONALLY_SAME',
    };

    const result = ZodTargetOptions.parse(values);

    ctx.expect(result.compressSoloReferencedTypes).toEqual(true);
    ctx.expect(result.compressUnreferencedSubTypes).toEqual(true);
    ctx.expect(result.allowCompressInterfaceToInner).toEqual(false);
    ctx.expect(result.additionalPropertiesInterfaceAfterDuplicateCount).toEqual(3);
    ctx.expect(result.compressTypesLevel).toEqual(CompressTypeLevel.FUNCTIONALLY_SAME);
    ctx.expect(result.compressTypeNaming).toEqual(CompressTypeNaming.EXACT);
  });

  test('basic2', ctx => {

    const values: Partial<Record<keyof TargetOptions, any>> = {
      compressSoloReferencedTypes: 't',
      compressUnreferencedSubTypes: 1,
      allowCompressInterfaceToInner: '0',
      additionalPropertiesInterfaceAfterDuplicateCount: '3',
      compressTypesLevel: 'FUNCTIONALLY_SAME',
    };

    const result = ZodTargetOptions.parse(values);

    ctx.expect(result.compressSoloReferencedTypes).toEqual(true);
    ctx.expect(result.compressUnreferencedSubTypes).toEqual(true);
    ctx.expect(result.allowCompressInterfaceToInner).toEqual(false);
    ctx.expect(result.additionalPropertiesInterfaceAfterDuplicateCount).toEqual(3);
    ctx.expect(result.compressTypesLevel).toEqual(CompressTypeLevel.FUNCTIONALLY_SAME);
    ctx.expect(result.compressTypeNaming).toEqual(CompressTypeNaming.EXACT);
  });
});

describe('plugin path', () => {

  test('no match', async ctx => {

    const pm = new PluginManager({includeAuto: false});
    pm.createPlugin('a', z.object({a: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.a}bar`}));

    await ctx.expect(pm.execute({ctx: {x: 'foo'}})).rejects.toThrow(`There was no plugin execution path found`);
  });

  test('match', async ctx => {

    const pm = new PluginManager({includeAuto: false});
    pm.createPlugin('a', z.object({a: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.a}bar`}));

    const result = await pm.execute({ctx: {a: 'foo'}});
    ctx.expect(result.results).toHaveLength(1);
    ctx.expect(result.results[0].ctx).toMatchObject({b: 'foobar'});
    ctx.expect(result.results[0].ctx).toEqual({a: 'foo', b: 'foobar'});
  });

  test('match 2 steps', async ctx => {

    const pm = new PluginManager({includeAuto: false});
    pm.createPlugin('p1', z.object({a: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.a}bar`}));
    pm.createPlugin('p2', z.object({b: z.string()}), z.object({c: z.string()}), async ctx => ({c: `${ctx.b}baz`}));

    const result = await pm.execute({ctx: {a: 'foo'}});
    ctx.expect(result.results).toHaveLength(2);
    ctx.expect(result.results[0].ctx).toEqual({a: 'foo', b: 'foobar'});
    ctx.expect(result.results[1].ctx).toEqual({a: 'foo', b: 'foobar', c: 'foobarbaz'});
  });

  test('match 2 steps, replace', async ctx => {

    const pm = new PluginManager({includeAuto: false});
    pm.createPlugin('p1', z.object({a: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.a}bar`}));
    pm.createPlugin('p2', z.object({b: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.b}baz`}));

    const result = await pm.execute({ctx: {a: 'foo'}});
    ctx.expect(result.results).toHaveLength(2);
    ctx.expect(result.results[0].ctx).toEqual({a: 'foo', b: 'foobar'});
    ctx.expect(result.results[1].ctx).toEqual({a: 'foo', b: 'foobarbaz'});
  });

  test('match 2 steps, 1 runtime', async ctx => {

    const pm = new PluginManager({includeAuto: false});
    pm.createPlugin('p1', z.object({a: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.a}bar`}));
    pm.createPlugin('p2', z.object({b: z.literal('foobar')}), z.object({c: z.string()}), async ctx => ({c: `${ctx.b}baz`}));

    const result = await pm.execute({ctx: {a: 'foo'}});
    ctx.expect(result.results).toHaveLength(2);
    ctx.expect(result.results[0].ctx).toMatchObject({b: 'foobar'});
    ctx.expect(result.results[1].ctx).toMatchObject({c: 'foobarbaz'});
  });

  test('match and rank by score, without runtime/pathing', async ctx => {

    const pm = new PluginManager({includeAuto: false});
    pm.createPlugin('p1', z.object({a: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.a}1`}));
    pm.createPlugin('p2', z.object({b: z.string()}), z.object({c: z.string()}), async ctx => ({c: `${ctx.b}2`}));
    pm.createPlugin('p3', z.object({c: z.string()}), z.object({d: z.string()}), async ctx => ({d: `${ctx.c}3`}));
    pm.createPlugin('p4', z.object({b: z.string()}), z.object({e: z.string()}), async ctx => ({e: `${ctx.b}4`}));

    const result = await pm.execute({ctx: {a: '0'}});
    ctx.expect(result.results).toHaveLength(4);
    ctx.expect(result.results[0].ctx).toMatchObject({b: '01'});
    ctx.expect(result.results[1].ctx).toMatchObject({c: '012'});
    ctx.expect(result.results[2].ctx).toMatchObject({d: '0123'});
    ctx.expect(result.results[2].ctx).not.toHaveProperty('e');
    ctx.expect(result.results[3].ctx).toMatchObject({d: '0123', e: '014'});
  });

  test('match and rank by score, with runtime/pathing', async ctx => {

    const pm = new PluginManager({includeAuto: false});
    pm.createPlugin('p1_2', z.object({a: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.a}1`}));
    pm.createPlugin('p2_3', z.object({b: z.string()}), z.object({c: z.string()}), async ctx => ({c: `${ctx.b}2`}));
    pm.createPlugin('p3_4', z.object({c: z.literal('012')}), z.object({d: z.string()}), async ctx => ({d: `${ctx.c}3`}));
    pm.createPlugin('p3_5', z.object({c: z.literal('no-match')}), z.object({d: z.string()}), async ctx => ({d: `${ctx.c}4`}));

    const result = await pm.execute({ctx: {a: '0'}});
    ctx.expect(result.results).toHaveLength(3);
    ctx.expect(result.results[0].ctx).toMatchObject({b: '01'});
    ctx.expect(result.results[1].ctx).toMatchObject({c: '012'});
    ctx.expect(result.results[2].ctx).toMatchObject({d: '0123'});
  });

  test('match and rank by score, with multiple matching runtime/pathing', async ctx => {

    const pm = new PluginManager({includeAuto: false});
    pm.createPlugin('p1_2', z.object({a: z.string()}), z.object({b: z.string()}), async ctx => ({b: `${ctx.a}1`}));
    pm.createPlugin('p2_3',
      z.object({b: z.literal('01'), c: z.undefined()}),
      z.object({c: z.string()}),
      async ctx => ({c: `${ctx.b}2`}),
    ).score = 1;
    pm.createPlugin('p2_4',
      z.object({b: z.literal('01'), c: z.undefined()}),
      z.object({c: z.string()}),
      async ctx => ({c: `${ctx.b}3`}),
    ).score = 5;

    const result = await pm.execute({ctx: {a: '0'}});
    ctx.expect(result.results).toHaveLength(2);
    ctx.expect(result.results[0].ctx).toMatchObject({b: '01'});
    ctx.expect(result.results[1].ctx).toMatchObject({c: '013'});
  });
});
