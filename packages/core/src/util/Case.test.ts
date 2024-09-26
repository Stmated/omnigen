import {Case} from './Case';
import {describe, test} from 'vitest';

describe('Case', () => {

  test('camelCase', ctx => {
    ctx.expect(Case.camel('test string')).toEqual('testString');
    ctx.expect(Case.camel('foo-bar')).toEqual('fooBar');
    ctx.expect(Case.camel('foo_bar')).toEqual('fooBar');
    ctx.expect(Case.camel('Foo-Bar')).toEqual('fooBar');
    ctx.expect(Case.camel('Foo-Bar-2')).toEqual('fooBar2');
    ctx.expect(Case.camel('Foo-Bar_2')).toEqual('fooBar2');
    ctx.expect(Case.camel('розовый_пушистый_единорог')).toEqual('розовыйПушистыйЕдинорог');
    ctx.expect(Case.camel('Foo-Bar', {pascalCase: true})).toEqual('FooBar');
    ctx.expect(Case.camel('--foo.bar', {pascalCase: false})).toEqual('fooBar');
    ctx.expect(Case.camel('Foo-BAR', {preserveConsecutiveUppercase: true})).toEqual('fooBAR');
    ctx.expect(Case.camel('fooBAR', {pascalCase: true, preserveConsecutiveUppercase: true})).toEqual('FooBAR');
    ctx.expect(Case.camel('foo bar')).toEqual('fooBar');
    ctx.expect(Case.camel('lorem-ipsum', {locale: 'en-US'})).toEqual('loremIpsum');
  });

  test('PascalCase', ctx => {
    ctx.expect(Case.pascal('a')).toEqual('A');
    ctx.expect(Case.pascal('foo bar baz')).toEqual('FooBarBaz');
    ctx.expect(Case.pascal('  foo bar baz  ')).toEqual('FooBarBaz');
    ctx.expect(Case.pascal('foo_bar-baz')).toEqual('FooBarBaz');
    ctx.expect(Case.pascal('foo_bar-baz_2')).toEqual('FooBarBaz2');
    ctx.expect(Case.pascal('foo.bar.baz')).toEqual('FooBarBaz');
    ctx.expect(Case.pascal('foo/bar/baz')).toEqual('FooBarBaz');
    ctx.expect(Case.pascal('foo[bar)baz')).toEqual('FooBarBaz');
    ctx.expect(Case.pascal('#foo+bar*baz')).toEqual('FooBarBaz');
    ctx.expect(Case.pascal('$foo~bar`baz')).toEqual('$fooBarBaz');
    ctx.expect(Case.pascal('_foo_bar-baz-')).toEqual('FooBarBaz');
    ctx.expect(Case.pascal('foo 2 bar 5 baz')).toEqual('Foo2Bar5Baz');
    ctx.expect(Case.pascal('foo2bar5baz')).toEqual('Foo2Bar5Baz');
    ctx.expect(Case.pascal('The IRS Is Mean')).toEqual('TheIrsIsMean');
    ctx.expect(Case.pascal('The IRS Is Mean', {preserveConsecutiveUppercase: true})).toEqual('TheIRSIsMean');
    ctx.expect(Case.pascal('We saw a UFO')).toEqual('WeSawAUfo');
    ctx.expect(Case.pascal('We saw a UFO', {preserveConsecutiveUppercase: true})).toEqual('WeSawAUFO');
  });
});

