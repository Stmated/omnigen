import {HashUtil} from './HashUtil';
import {OmniTypeKind} from './OmniModel';

test('Unknown', async () => {

  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.UNKNOWN});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.UNKNOWN});

  expect(hash1).toEqual(hash2);
});

test('Object w/ same name', async () => {

  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: 'a'});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: 'a'});

  expect(hash1).toEqual(hash2);
});

test('Object w/ diff name', async () => {

  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: 'a'});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: 'b'});

  expect(hash1).not.toEqual(hash2);
});

test('Object w/ same nested name', async () => {

  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: ['a']});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: ['a', 'b']});

  expect(hash1).toEqual(hash2);
});

test('Object w/ diff nested name', async () => {

  // The hashing only considers the FIRST resolved name.
  // This is for SPEED and SIMPLICITY. But is a good area to explore later someday to support any name matching.
  const hash1 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: ['a']});
  const hash2 = HashUtil.getStructuralHashOf({kind: OmniTypeKind.OBJECT, properties: [], name: ['b', 'a']});

  expect(hash1).not.toEqual(hash2);
});
