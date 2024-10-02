import {describe, test} from 'vitest';
import {JsonUri} from './JsonUri';
import * as path from 'path';

describe('JsonPath', () => {

  const jsonPath = JsonUri.EMPTY;
  const wd = path.resolve('');

  test('reference-to-node-behavior', ctx => {

    ctx.expect(path.resolve('/a/b/c.txt')).toEqual(`/a/b/c.txt`);
    ctx.expect(path.resolve('/a/b/c.txt', '/d/e/f.txt')).toEqual('/d/e/f.txt');
    ctx.expect(path.resolve('/a/b/c.txt', 'd.txt')).toEqual('/a/b/c.txt/d.txt');
    ctx.expect(path.resolve('/a/b/c.txt', '../d.txt')).toEqual('/a/b/d.txt');
  });

  test('empty', ctx => {

    ctx.expect(jsonPath.hashParts).toHaveLength(0);
    ctx.expect(jsonPath.hash).toEqual('');
    ctx.expect(jsonPath.absoluteHash).toEqual('/');
  });

  test('file', ctx => {

    const resource = jsonPath.resolve('some/file.txt');
    ctx.expect(resource.absolutePath).toEqual(`file:${wd}/some/file.txt`);

    const parent = resource.parentPath!;
    ctx.expect(parent.absolutePath).toEqual(`file:${wd}/some`);

    const grandparent = parent.parentPath!;
    ctx.expect(grandparent.absolutePath).toEqual(`file:${wd}`);

    const other = resource.resolve('another_file.txt');
    ctx.expect(other.absolutePath).toEqual(`file:${wd}/some/another_file.txt`);
  });

  test('url', ctx => {

    const resource = jsonPath.resolve('www.somewhere.com/file.txt');
    ctx.expect(resource.absolutePath).toEqual(`https://www.somewhere.com/file.txt`);

    const parent = resource.parentPath!;
    ctx.expect(parent.absolutePath).toEqual(`https://www.somewhere.com/`);

    const grandparent = parent.parentPath!;
    ctx.expect(grandparent.absolutePath).toEqual(`https://www.somewhere.com/`);

    const other = resource.resolve('another_file.txt');
    ctx.expect(other.absolutePath).toEqual(`https://www.somewhere.com/another_file.txt`);
  });

  test('hash', ctx => {

    const resource = jsonPath.resolve('some/path/to/file.txt');
    ctx.expect(resource.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt`);

    const resourceWithRelativeHash = resource.resolve('#a');
    ctx.expect(resourceWithRelativeHash.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt#/a`);

    const resourceWithAbsoluteHash = resource.resolve('#/a');
    ctx.expect(resourceWithAbsoluteHash.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt#/a`);

    const childRelativeHash = resourceWithAbsoluteHash.resolve('#b/c/d');
    ctx.expect(childRelativeHash.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt#/a/b/c/d`);

    const childParentHash = childRelativeHash.resolve('#..');
    ctx.expect(childParentHash.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt#/a/b/c`);

    const childGrandparentHash = childRelativeHash.resolve('#../..');
    ctx.expect(childGrandparentHash.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt#/a/b`);

    const childGrandparentByArrayHash = childRelativeHash.resolve(['#..', '#..']);
    ctx.expect(childGrandparentByArrayHash.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt#/a/b`);

    const bothParent = childRelativeHash.resolve('..#..');
    ctx.expect(bothParent.absolutePath).toEqual(`file:${wd}/some/path/to#/a/b/c`);

    const bothGrandparent = childRelativeHash.resolve('../..#../..');
    ctx.expect(bothGrandparent.absolutePath).toEqual(`file:${wd}/some/path#/a/b`);

    const bothGrandparentByArray = childRelativeHash.resolve(['..#..', '..#..']);
    ctx.expect(bothGrandparentByArray.absolutePath).toEqual(`file:${wd}/some/path#/a/b`);
  });

  test('absolute-switch', ctx => {

    const file = jsonPath.resolve('some/path/to/file.txt#a/b/c');
    ctx.expect(file.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt#/a/b/c`);

    const url = jsonPath.resolve('www.somewhere.com/here/file.txt#a/b/c');
    ctx.expect(url.absolutePath).toEqual(`https://www.somewhere.com/here/file.txt#/a/b/c`);


    const fileNewAbsolute = file.resolve('file:/other/path/to/file.txt');
    ctx.expect(fileNewAbsolute.absolutePath).toEqual(`file:/other/path/to/file.txt`);

    const urlNewAbsolute = url.resolve('www.elsewhere.com/there/file.txt');
    ctx.expect(urlNewAbsolute.absolutePath).toEqual(`https://www.elsewhere.com/there/file.txt`);
  });

  test('protocol-switch', ctx => {

    const resource1 = jsonPath.resolve('some/path/to/file.txt#a/b/c');
    ctx.expect(resource1.absolutePath).toEqual(`file:${wd}/some/path/to/file.txt#/a/b/c`);

    const resource2 = jsonPath.resolve('www.somewhere.com/here/file.txt#a/b/c');
    ctx.expect(resource2.absolutePath).toEqual(`https://www.somewhere.com/here/file.txt#/a/b/c`);


    const changedResource1 = resource1.resolve('ftp:/file-server.com/some/file.txt');
    ctx.expect(changedResource1.absolutePath).toEqual(`ftp:/file-server.com/some/file.txt`);

    ctx.expect(() => resource2.resolve('file:some/relative/path/file.txt')).toThrow(`Cannot switch from 'https' to 'file' with a relative path`);
  });
});
