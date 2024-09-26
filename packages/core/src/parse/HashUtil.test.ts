import {HashUtil} from './HashUtil';
import {OmniTypeKind} from '@omnigen/api';
import {test} from 'vitest';

test('Unknown', async ctx => {

  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.UNKNOWN});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.UNKNOWN});

  ctx.expect(hash1).toEqual(hash2);
});

test('Object w/ same name', async ctx => {

  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: 'a'});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: 'a'});

  ctx.expect(hash1).toEqual(hash2);
});

test('Object w/ diff name', async ctx => {

  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: 'a'});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: 'b'});

  ctx.expect(hash1).not.toEqual(hash2);
});

test('Object w/ same nested name', async ctx => {

  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: ['a']});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: ['a', 'b']});

  ctx.expect(hash1).toEqual(hash2);
});

test('Object w/ diff nested name', async ctx => {

  // The hashing only considers the FIRST resolved name.
  // This is for SPEED and SIMPLICITY. But is a good area to explore later someday to support any name matching.
  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: ['a']});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: ['b', 'a']});

  ctx.expect(hash1).not.toEqual(hash2);
});
