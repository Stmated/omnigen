import {describe, test} from 'vitest';
import {JsonSchemaNameParser, NameOptions} from './JsonSchemaNameParser.ts';
import {JSONSchema9} from '../definitions';
import {TypeName} from '@omnigen/api';
import {ExternalDocumentsFinder} from '../visit';
import {DocumentStore} from '@omnigen/core-json';

describe('JsonSchemaNameParser', () => {

  const parser = new JsonSchemaNameParser();

  const schema1 = {
    $defs: {
      Foo: {
        type: 'object',
      },
      Bar: {
        $ref: '#/$defs/Foo',
      },
      Baz: {
        title: 'MyBaz',
        type: 'object',
        $ref: '#/$defs/Bar',
        properties: {
          PropA: {
            type: 'string',
          },
        },
      },
      Item: {
        type: 'object',
        properties: {
          ItemPropA: {
            type: 'number',
          },
          ItemPropB: {
            type: 'string',
          },
        },
      },
      ObjWithRefProps: {
        type: 'object',
        properties: {
          DirectRef: {
            $ref: '#/$defs/Item',
          },
          PartialRef: {
            title: 'PropB',
            $ref: '#/$defs/Item',
          },
        },
      },
    },
  } as const satisfies JSONSchema9;

  const indirectSchema = {
    $defs: {
      Foo: {
        properties: {
          // One not-direct ref
          content: {
            $comment: 'https://spec.openapis.org/oas/v3.1.0#fixed-fields-10',
            type: 'object',
            additionalProperties: {
              type: 'string',
            },
            minProperties: 1,
            maxProperties: 1,
          },
        },
      },
      Bar: {
        properties: {
          // One direct-ref
          content: {
            $comment: 'https://spec.openapis.org/oas/v3.1.0#fixed-fields-10',
            type: 'object',
            additionalProperties: {
              type: 'string',
            },
          },
        },
      },
      // content: {
      //
      // },
    },

  } as const satisfies JSONSchema9;

  const docStore = new DocumentStore();
  const documentsFinder = new ExternalDocumentsFinder('/', schema1, docStore);
  const refResolver = documentsFinder.create();

  test('no schema with suffix', ctx => {

    ctx.expect(parser.parse({}, undefined, {key: 'Key', suffix: 'Suffix'} satisfies NameOptions)).toEqual({name: 'Key', suffix: 'Suffix'} satisfies TypeName);
  });

  test('no schema with fallback suffix', ctx => {

    ctx.expect(parser.parse({}, undefined, {key: 'Key', fallbackSuffix: 'Suffix'} satisfies NameOptions)).toEqual([
      'Key',
      {name: 'Key', suffix: 'Suffix'},
    ] satisfies TypeName);
  });

  test('simple', ctx => {
    ctx.expect(parser.parse(schema1.$defs.Foo)).toEqual('Object');
  });

  test('simple with key', async ctx => {
    const name = parser.parse(schema1.$defs.Foo, undefined, {key: 'Foo'} satisfies NameOptions);
    await ctx.expect(JSON.stringify(name, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('simple with key+suffix', async ctx => {
    const name = parser.parse(schema1.$defs.Foo, undefined, {key: 'Foo', suffix: 'Suf'} satisfies NameOptions);
    await ctx.expect(JSON.stringify(name, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('ref', ctx => {
    ctx.expect(parser.parse(schema1.$defs.Bar)).toEqual('Foo');
  });

  test('ref-2-steps', async ctx => {
    const name = parser.parse(schema1.$defs.Baz);
    await ctx.expect(JSON.stringify(name, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('object', async ctx => {
    const name = parser.parse(schema1.$defs.ObjWithRefProps, undefined, {key: 'ObjWithRefProps'} satisfies NameOptions)
    await ctx.expect(JSON.stringify(name, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('property direct ref without resolved', async ctx => {
    const name = parser.parse(schema1.$defs.ObjWithRefProps.properties.DirectRef, undefined, {ownerName: 'Owner'} satisfies NameOptions);
    await ctx.expect(JSON.stringify(name, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('property direct ref with resolved', async ctx => {
    const ownerName = parser.parse(schema1.$defs.ObjWithRefProps, undefined, {key: 'ObjWithRefProps'} satisfies NameOptions);
    const resolvedProp = refResolver.resolve(schema1.$defs.ObjWithRefProps.properties.DirectRef, []);

    const name = parser.parse(schema1.$defs.ObjWithRefProps.properties.DirectRef, resolvedProp, {ownerName});
    await ctx.expect(JSON.stringify(name, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('property partial ref', async ctx => {
    const name = parser.parse(schema1.$defs.ObjWithRefProps.properties.PartialRef, undefined, {ownerName: 'Owner'} satisfies NameOptions);
    await ctx.expect(JSON.stringify(name, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('property partial ref resolved', async ctx => {
    const resolved = refResolver.resolve(schema1.$defs.ObjWithRefProps.properties.PartialRef, []);
    const name = parser.parse(schema1.$defs.ObjWithRefProps.properties.PartialRef, resolved, {ownerName: 'Owner'} satisfies NameOptions);
    await ctx.expect(JSON.stringify(name, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });

  test('same-comments', async ctx => {

    const indirectStore = new DocumentStore();
    const indirectFinder = new ExternalDocumentsFinder('/', indirectSchema, indirectStore);
    const indirectRefResolver = indirectFinder.create();

    const fooName = parser.parse(indirectSchema.$defs.Foo, undefined, {key: 'Foo'});
    const barName = parser.parse(indirectSchema.$defs.Bar, undefined, {key: 'Bar'});

    const fooContentResolved = indirectRefResolver.resolve(indirectSchema.$defs.Foo.properties.content, []);
    const barContentResolved = indirectRefResolver.resolve(indirectSchema.$defs.Bar.properties.content, []);

    const fooContentName = parser.parse(indirectSchema.$defs.Foo.properties.content, fooContentResolved, {ownerName: fooName, key: 'content'});
    const barContentName = parser.parse(indirectSchema.$defs.Bar.properties.content, barContentResolved, {ownerName: barName, key: 'content'});

    const names = {
      first: fooContentName,
      second: barContentName,
    };

    await ctx.expect(JSON.stringify(names, undefined, 2)).toMatchFileSnapshot(`./__snapshots__/${ctx.task.suite?.name}/${ctx.task.name}.json`);
  });


});
