import {Dereferencer} from './index';
import * as fs from 'fs/promises';
import nock from 'nock';
import {LoggerFactory} from '@omnigen/core-log';
import {describe, test, expect} from 'vitest';

const logger = LoggerFactory.create(import.meta.url);

describe('Test ObjectRefTraverser', () => {

  test('Test Local', async () => {

    const obj = {
      a: {
        value: 'x',
      },
      b: {
        $ref: '#/a/value',
      },
    };

    const traverser = await Dereferencer.create('', '', obj);
    expect(traverser.get(obj, obj).obj).toEqual(obj);
    expect(traverser.get(obj.b, obj).obj).toEqual('x');
  });

  test('Expect Exception From Unresolved', async () => {

    const obj = {
      a: {
        value: 'x',
      },
      b: {
        $ref: '#/a/value',
      },
    };

    const traverser = await Dereferencer.create('', '', obj);
    obj.b.$ref = 'https://some-new-place-that-does-not-exist.com#/foo/bar';

    expect(() => traverser.get(obj.b, obj)).toThrow();
  });

  test('Test External', async () => {

    const obj = (await readFile('a.json')) as any;

    const traverser = await Dereferencer.create('../parser-jsonschema/examples', '../parser-jsonschema/examples/a.json', obj);

    expect(traverser.get(obj.a_c, obj).obj).toEqual('y');
  });

  test('Test External Nested', async () => {

    const obj = (await readFile('a.json')) as any;

    const traverser = await Dereferencer.create('../parser-jsonschema/examples', '../parser-jsonschema/examples/a.json', obj);

    const c = traverser.get(obj.a_e, obj);
    expect(c.obj.c_a.value).toEqual('z');
    const bb = traverser.get(c?.obj.c_e, c.root);
    expect(bb.obj).toEqual({value: 'foo'});
  });

  test('URL, w/ missing dir/c.json', async () => {

    nock('https://omnigen.fake.localhost')
      .get('/a')
      .replyWithFile(200, '../parser-jsonschema/examples/a.json');

    nock('https://omnigen.fake.localhost')
      .get('/b.json')
      .replyWithError('The file does not exist');

    try {
      await Dereferencer.create<any>('https://omnigen.fake.localhost', 'https://omnigen.fake.localhost/a');
      throw new Error('This creation is supposed to fail, since the documents cannot be fetched');
    } catch (ex) {
      if (ex instanceof Error) {
        expect(ex.message).toContain('The file does not exist');
      } else {
        throw new Error('The exception should be an Error');
      }
    }
  });

  test('URL, w/ existing mocked files', async () => {

    nock('https://omnigen.fake.localhost.com')
      .get('/a')
      .replyWithFile(200, '../parser-jsonschema/examples/a.json');

    nock('https://omnigen.fake.localhost.com')
      .get('/b.json')
      .replyWithFile(200, '../parser-jsonschema/examples/b.json');

    nock('https://omnigen.fake.localhost.com')
      .get('/dir/c.json')
      .replyWithFile(200, '../parser-jsonschema/examples/dir/c.json');

    const traverser = await Dereferencer.create<any>('https://omnigen.fake.localhost.com', 'https://omnigen.fake.localhost.com/a');

    const c = traverser.get(traverser.getFirstRoot().a_e, traverser.getFirstRoot());
    expect(c.obj.c_a.value).toEqual('z');

    const bb = traverser.get(c.obj.c_e, c.root);
    expect(bb.obj).toEqual({value: 'foo'});
  });
});

async function readFile(filename: string): Promise<unknown> {

  const buffer = await fs.readFile(`../parser-jsonschema/examples/${filename}`);
  return JSON.parse(buffer.toString());
}
