import {Naming} from './Naming';
import {test} from 'vitest';

const obj1 = {};
const obj2 = {};
const obj3 = {};
const obj4 = {};
const obj5 = {};
const obj6 = {};
const obj7 = {};

test('Single', async ctx => {

  ctx.expect(Naming.unwrap('a')).toEqual('A');
  ctx.expect(() => Naming.unwrap([])).toThrowError();

  // ctx.expect(Naming.unwrap([])).toEqual(undefined);
  ctx.expect(Naming.unwrap(['a', 'b'])).toEqual('A');
  ctx.expect(Naming.unwrap(['b', 'a', 'c'])).toEqual('B');
});

test('Fallback', async ctx => {
  ctx.expect(Naming.unwrapPairs([
    {owner: obj1, name: ['a', 'b']},
    {owner: obj2, name: ['a', 'b']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'B'},
  ]);
});


// We also test that the owner has no impact on what names we get.
test('Owner-No-Impact', async ctx => {
  ctx.expect(Naming.unwrapPairs([
    {owner: obj1, name: ['a']},
    {owner: obj1, name: ['b']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj1, name: 'B'},
  ]);
});

test('Indexed', async ctx => {
  ctx.expect(Naming.unwrapPairs([
    {owner: obj1, name: ['a']},
    {owner: obj2, name: ['a']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'A_1'},
  ]);
});

test('Indexed-Many', async ctx => {

  ctx.expect(Naming.unwrapPairs([
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

test('Indexed-Overflow', async ctx => {

  const overflow = Naming.unwrapPairs([
    {owner: obj1, name: ['a']},
    {owner: obj2, name: ['a']},
    {owner: obj3, name: ['a']},
    {owner: obj4, name: ['a']},
    {owner: obj5, name: ['a']},
    {owner: obj6, name: ['a']},
    {owner: obj7, name: ['a']},
  ]);

  ctx.expect(overflow[5].name).toEqual('A_5');
  ctx.expect(overflow[6].name).toMatch(/A_[0-9a-z]{40}/);
});

test('Prefix', async ctx => {

  ctx.expect(Naming.unwrap({prefix: 'PRE', name: 'a'})).toEqual('PREa');
  ctx.expect(() => Naming.unwrap({prefix: 'PRE', name: []})).toThrowError();
  ctx.expect(Naming.unwrap({prefix: 'PRE', name: ['a', 'b']})).toEqual('PREa');
  ctx.expect(Naming.unwrap({prefix: 'PRE', name: ['b', 'a', 'c']})).toEqual('PREb');
});

test('Suffix', async ctx => {

  ctx.expect(Naming.unwrap({suffix: 'SUF', name: 'a'})).toEqual('ASUF');
  ctx.expect(() => Naming.unwrap({suffix: 'SUF', name: []})).toThrowError();
  ctx.expect(Naming.unwrap({suffix: 'SUF', name: ['a', 'b']})).toEqual('ASUF');
  ctx.expect(Naming.unwrap({suffix: 'SUF', name: ['b', 'a', 'c']})).toEqual('BSUF');
});

test('Prefix+Suffix', async ctx => {

  ctx.expect(Naming.unwrap({prefix: 'PRE', suffix: 'SUF', name: 'a'})).toEqual('PREaSUF');
  ctx.expect(() => Naming.unwrap({prefix: 'PRE', suffix: 'SUF', name: []})).toThrowError();
  ctx.expect(Naming.unwrap({prefix: 'PRE', suffix: 'SUF', name: ['a', 'b']})).toEqual('PREaSUF');
  ctx.expect(Naming.unwrap({prefix: 'PRE', suffix: 'SUF', name: ['b', 'a', 'c']})).toEqual('PREbSUF');
});

test('Slashes', async ctx => {

  ctx.expect(Naming.unwrapPairs([
    {owner: obj1, name: ['components/a']},
    {owner: obj2, name: ['schemas/a']},
    {owner: obj3, name: ['b']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'SchemasA'},
    {owner: obj3, name: 'B'},
  ]);
});

test('Slashes With Case-Insensitivity', async ctx => {

  ctx.expect(Naming.unwrapPairs([
    {owner: obj1, name: ['components/a']},
    {owner: obj2, name: ['schemas/a']},
    {owner: obj3, name: ['A']},
  ])).toEqual([
    {owner: obj1, name: 'A'},
    {owner: obj2, name: 'SchemasA'},
    {owner: obj3, name: 'A_1'},
  ]);
});

test('Prefix-Different', async ctx => {

  ctx.expect(Naming.unwrapPairs([
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

test('Prefix-Multi', async ctx => {

  // Test that the fallback is properly ordered if we have multiple prefixes.
  ctx.expect(Naming.unwrapPairs([
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

test('Common words', async ctx => {

  ctx.expect(Naming.getCommonName(['Foo', 'Bar', 'Baz'])).toBeUndefined();
  ctx.expect(Naming.getCommonName(['Foo'])).toEqual('Foo');
  ctx.expect(Naming.getCommonName(['FooBar', 'FooBaz'])).toBeUndefined();
  ctx.expect(Naming.getCommonName(['FooBar', 'FooBaz'], 1)).toEqual('Foo');
  ctx.expect(Naming.getCommonName(['BarBaz', 'BarFoo'], 1)).toEqual('Bar');
  ctx.expect(Naming.getCommonName(['Bar_Baz', 'Bar_Foo'], 1)).toEqual('Bar');
  ctx.expect(Naming.getCommonName(['Bar Baz', 'Bar Foo'], 1)).toEqual('Bar');

  ctx.expect(Naming.getCommonName(['SomeInTheMiddleWord', 'AnotherInTheMiddleToken'])).toEqual('InTheMiddle');
});

test('Common words with diff prefix', async ctx => {

  ctx.expect(Naming.getCommonName([
    'ThisHasSomeWordsInsideOfIt',
    'ThisAlsoHasSomeWordsInsideOfIt',
    'SomePartAlsoHasSomeWordsInsideOfIt',
  ])).toEqual('HasSomeWordsInsideOfIt');
});

test('Common words by total length', async ctx => {

  ctx.expect(Naming.getCommonName([
    'CatDogDuck',
    'DuckCatDog',
    'DogDuckCat',
  ], 1)).toEqual('Duck');
});

test('Common words by total length with prefix', async ctx => {

  ctx.expect(Naming.getCommonName([
    'PrefixCatDogDuck',
    'PrefixDuckCatDog',
    'PrefixDogDuckCat',
  ], 1)).toEqual('PrefixDuck');
});

test('Common words by total length with suffix', async ctx => {

  ctx.expect(Naming.getCommonName([
    'CatDogDuckSuffix',
    'DuckCatDogSuffix',
    'DogDuckCatSuffix',
  ], 1)).toEqual('DuckSuffix');
});

test('Common words by total length with prefix and suffix', async ctx => {

  ctx.expect(Naming.getCommonName([
    'PrefixCatDogDuckSuffix',
    'PrefixDuckCatDogSuffix',
    'PrefixDogDuckCatSuffix',
  ], 1)).toEqual('PrefixDuckSuffix');
});

test('Common words by total length with prefix repeated prefix and suffix', async ctx => {

  ctx.expect(Naming.getCommonName([
    'PrefixCatDogPrefixDuckSuffixSuffix',
    'PrefixPrefixDuckSuffixCatDogSuffix',
    'PrefixDogPrefixDuckSuffixCatSuffix',
  ], 1)).toEqual('PrefixDuckSuffix');
});

test('multiple-prefix-unwrap', async ctx => {

  ctx.expect(Naming.unwrap([
    {name: 'n', prefix: {name: {prefix: {prefix: {name: 'p3'}, name: 'p2'}, name: 'p1'}}},
    {name: 'n', prefix: {name: {prefix: {name: 'p2'}, name: 'p1'}}},
    {name: 'n', prefix: {name: 'p1'}},
  ])).toEqual('P3P2P1N');

  ctx.expect(Naming.unwrap([
    {name: 'n', prefix: {name: {prefix: {name: 'p2'}, name: 'p1'}}},
    {name: 'n', prefix: {name: {prefix: {prefix: {name: 'p3'}, name: 'p2'}, name: 'p1'}}},
    {name: 'n', prefix: {name: 'p1'}},
  ])).toEqual('P2P1N');

  ctx.expect(Naming.unwrap([
    {name: 'n', prefix: {name: 'p1'}},
    {name: 'n', prefix: {name: {prefix: {name: 'p2'}, name: 'p1'}}},
    {name: 'n', prefix: {name: {prefix: {prefix: {name: 'p3'}, name: 'p2'}, name: 'p1'}}},
  ])).toEqual('P1N');
});

test('deduplicate non-array and array items', async ctx => {
  ctx.expect(Naming.simplify(['A', ['A', 'B'], 'C'])).toEqual(['A', 'B', 'C']);
});

test('aggregate common denominator array', async ctx => {
  ctx.expect(Naming.simplify([{name: 'A', suffix: 'S1'}, {name: 'A', suffix: 'S2'}])).toEqual({name: 'A', suffix: ['S1', 'S2']});
});
