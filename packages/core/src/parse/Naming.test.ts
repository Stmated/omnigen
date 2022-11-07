import {Naming} from './Naming';

const obj1 = {};
const obj2 = {};
const obj3 = {};
const obj4 = {};
const obj5 = {};
const obj6 = {};
const obj7 = {};

test('Single', async () => {

  expect(Naming.unwrap('a')).toEqual('A');
  expect(Naming.unwrap([])).toEqual(undefined);
  expect(Naming.unwrap(['a', 'b'])).toEqual('A');
  expect(Naming.unwrap(['b', 'a', 'c'])).toEqual('B');
});

test('Fallback', async () => {
  expect(Naming.unwrap([
    {owner: obj1, name: ['a', 'b']},
    {owner: obj2, name: ['a', 'b']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'B'},
  ]);
});


// We also test that the owner has no impact on what names we get.
test('Owner-No-Impact', async () => {
  expect(Naming.unwrap([
    {owner: obj1, name: ['a']},
    {owner: obj1, name: ['b']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj1, name: 'B'},
  ]);
});

test('Indexed', async () => {
  expect(Naming.unwrap([
    {owner: obj1, name: ['a']},
    {owner: obj2, name: ['a']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'A_1'},
  ]);
});

test('Indexed-Many', async () => {

  expect(Naming.unwrap([
    {owner: obj1, name: ['a']},
    {owner: obj2, name: ['a']},
    {owner: obj3, name: ['a']},
    {owner: obj4, name: ['a']},
    {owner: obj5, name: ['a']},
    {owner: obj6, name: ['a']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'A_1'},
    {owner: obj3, name: 'A_2'},
    {owner: obj4, name: 'A_3'},
    {owner: obj5, name: 'A_4'},
    {owner: obj6, name: 'A_5'},
  ]);
});

test('Indexed-Overflow', async () => {

  const overflow = Naming.unwrap([
    {owner: obj1, name: ['a']},
    {owner: obj2, name: ['a']},
    {owner: obj3, name: ['a']},
    {owner: obj4, name: ['a']},
    {owner: obj5, name: ['a']},
    {owner: obj6, name: ['a']},
    {owner: obj7, name: ['a']},
  ]);

  expect(overflow[5].name).toEqual('A_5');
  expect(overflow[6].name).toMatch(/A_[0-9a-z]{40}/);
});

test('Prefix', async () => {

  expect(Naming.unwrap({prefix: 'PRE', name: 'a'})).toEqual('PREa');
  expect(Naming.unwrap({prefix: 'PRE', name: []})).toEqual(undefined);
  expect(Naming.unwrap({prefix: 'PRE', name: ['a', 'b']})).toEqual('PREa');
  expect(Naming.unwrap({prefix: 'PRE', name: ['b', 'a', 'c']})).toEqual('PREb');
});

test('Suffix', async () => {

  expect(Naming.unwrap({suffix: 'SUF', name: 'a'})).toEqual('ASUF');
  expect(Naming.unwrap({suffix: 'SUF', name: []})).toEqual(undefined);
  expect(Naming.unwrap({suffix: 'SUF', name: ['a', 'b']})).toEqual('ASUF');
  expect(Naming.unwrap({suffix: 'SUF', name: ['b', 'a', 'c']})).toEqual('BSUF');
});

test('Prefix+Suffix', async () => {

  expect(Naming.unwrap({prefix: 'PRE', suffix: 'SUF', name: 'a'})).toEqual('PREaSUF');
  expect(Naming.unwrap({prefix: 'PRE', suffix: 'SUF', name: []})).toEqual(undefined);
  expect(Naming.unwrap({prefix: 'PRE', suffix: 'SUF', name: ['a', 'b']})).toEqual('PREaSUF');
  expect(Naming.unwrap({prefix: 'PRE', suffix: 'SUF', name: ['b', 'a', 'c']})).toEqual('PREbSUF');
});

test('Slashes', async () => {

  expect(Naming.unwrap([
    {owner: obj1, name: ['components/a']},
    {owner: obj2, name: ['schemas/a']},
    {owner: obj3, name: ['b']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'SchemasA'},
    {owner: obj3, name: 'B'},
  ]);
});

test('Slashes With Case-Insensitivity', async () => {

  expect(Naming.unwrap([
    {owner: obj1, name: ['components/a']},
    {owner: obj2, name: ['schemas/a']},
    {owner: obj3, name: ['A']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'SchemasA'},
    {owner: obj3, name: 'A_1'},
  ]);
});

test('Prefix-Different', async () => {

  expect(Naming.unwrap([
    {owner: obj1, name: {prefix: 'a', name: ['a']}},
    {owner: obj2, name: {prefix: 'b', name: ['a']}},
    {owner: obj3, name: {prefix: 'c', name: ['a']}},
    {owner: obj4, name: {prefix: 'd', name: ['a']}},
    {owner: obj5, name: {prefix: 'e', name: ['a']}},
    {owner: obj6, name: {prefix: 'f', name: ['a']}},
  ])).toEqual([
    {owner: obj1, name: 'Aa'},
    {owner: obj2, name: 'Ba'},
    {owner: obj3, name: 'Ca'},
    {owner: obj4, name: 'Da'},
    {owner: obj5, name: 'Ea'},
    {owner: obj6, name: 'Fa'},
  ]);
});

test('Prefix-Multi', async () => {

  // Test that the fallback is properly ordered if we have multiple prefixes.
  expect(Naming.unwrap([
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
    {owner: obj1, name: {prefix: ['a', 'b', 'c', 'd', 'e', 'f'], name: ['a']}},
  ])).toEqual([
    {owner: obj1, name: 'Aa'},
    {owner: obj1, name: 'Ba'},
    {owner: obj1, name: 'Ca'},
    {owner: obj1, name: 'Da'},
    {owner: obj1, name: 'Ea'},
    {owner: obj1, name: 'Fa'},
    {owner: obj1, name: 'Aa_1'},
    {owner: obj1, name: 'Ba_1'},
    {owner: obj1, name: 'Ca_1'},
    {owner: obj1, name: 'Da_1'},
    {owner: obj1, name: 'Ea_1'},
    {owner: obj1, name: 'Fa_1'},
    {owner: obj1, name: 'Aa_2'},
    {owner: obj1, name: 'Ba_2'},
  ]);
});
