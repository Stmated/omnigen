import {Case} from './Case';
import {describe, test, expect} from 'vitest';

describe('Case', () => {

  test('camelCase', async () => {
    expect(Case.camel('test string')).toEqual('testString');
    expect(Case.camel('foo-bar')).toEqual('fooBar');
    expect(Case.camel('foo_bar')).toEqual('fooBar');
    expect(Case.camel('Foo-Bar')).toEqual('fooBar');
    expect(Case.camel('Foo-Bar-2')).toEqual('fooBar2');
    expect(Case.camel('Foo-Bar_2')).toEqual('fooBar2');
    expect(Case.camel('розовый_пушистый_единорог')).toEqual('розовыйПушистыйЕдинорог');
    expect(Case.camel('Foo-Bar', {pascalCase: true})).toEqual('FooBar');
    expect(Case.camel('--foo.bar', {pascalCase: false})).toEqual('fooBar');
    expect(Case.camel('Foo-BAR', {preserveConsecutiveUppercase: true})).toEqual('fooBAR');
    expect(Case.camel('fooBAR', {pascalCase: true, preserveConsecutiveUppercase: true})).toEqual('FooBAR');
    expect(Case.camel('foo bar')).toEqual('fooBar');
    expect(Case.camel('lorem-ipsum', {locale: 'en-US'})).toEqual('loremIpsum');
  });

  test('PascalCase', async () => {
    expect(Case.pascal('a')).toEqual('A');
    expect(Case.pascal('foo bar baz')).toEqual('FooBarBaz');
    expect(Case.pascal('  foo bar baz  ')).toEqual('FooBarBaz');
    expect(Case.pascal('foo_bar-baz')).toEqual('FooBarBaz');
    expect(Case.pascal('foo_bar-baz_2')).toEqual('FooBarBaz2');
    expect(Case.pascal('foo.bar.baz')).toEqual('FooBarBaz');
    expect(Case.pascal('foo/bar/baz')).toEqual('FooBarBaz');
    expect(Case.pascal('foo[bar)baz')).toEqual('FooBarBaz');
    expect(Case.pascal('#foo+bar*baz')).toEqual('FooBarBaz');
    expect(Case.pascal('$foo~bar`baz')).toEqual('$fooBarBaz');
    expect(Case.pascal('_foo_bar-baz-')).toEqual('FooBarBaz');
    expect(Case.pascal('foo 2 bar 5 baz')).toEqual('Foo2Bar5Baz');
    expect(Case.pascal('foo2bar5baz')).toEqual('Foo2Bar5Baz');
    expect(Case.pascal('The IRS Is Mean')).toEqual('TheIrsIsMean');
    expect(Case.pascal('The IRS Is Mean', {preserveConsecutiveUppercase: true})).toEqual('TheIRSIsMean');
    expect(Case.pascal('We saw a UFO')).toEqual('WeSawAUfo');
    expect(Case.pascal('We saw a UFO', {preserveConsecutiveUppercase: true})).toEqual('WeSawAUFO');
  });
});

