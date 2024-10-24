import {describe, test} from 'vitest';
import {ProxyReducer2} from './ProxyReducer2';
import {expectTs, isDefined} from '../util';
import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2';
import {ANY_KIND, SpecFn2} from './types';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2';

interface Base {
  readonly foo?: Foo | undefined;
  readonly foos?: Array<Foo> | undefined;
  readonly bar?: Bar | undefined;
  readonly bars?: Array<Bar> | undefined;
  readonly baz?: Baz | undefined;
}

interface Foo extends Base {
  readonly k: 'Foo';
  readonly x: number;
  readonly y: number;
  readonly common?: string;
}

interface Bar extends Base {
  readonly k: 'Bar';
  readonly a: number;
  readonly b: number;
  readonly common?: string;
}

interface Baz {
  readonly k: 'Baz';
  readonly v?: unknown;
}

type Types = Foo | Bar | Baz;
type TypesOverride = { Foo: Foo | Bar };

const typesReducerBaseBuilder = ProxyReducer2.builder<Types, TypesOverride>().discriminator('k').options({immutable: false});

const fooBarReducer: SpecFn2<Types, Foo | Bar, 'k', TypesOverride, { immutable: false }, []> = (n, r) => {

  if (n.foo) {
    const reduced = r.reduce(n.foo);
    if (reduced.k === 'Foo') {
      r.put('foo', reduced);
    } else {
      r.put('bar', reduced);
    }
  }

  if (n.bar) r.put('bar', r.reduce(n.bar));
  if (n.baz) r.put('baz', r.reduce(n.baz));

  // TODO: We should have a helper function which maps arrays for us, since it is needlessly heavy to create new arrays all the time.
  if (n.foos) r.put('foos', n.foos.map(it => r.reduce(it)).filter(isDefined).filter(it => it.k === 'Foo'));
  if (n.bars) r.put('bars', n.bars.map(it => r.reduce(it)).filter(isDefined).filter(it => it.k === 'Bar'));

  // return n;
};

const typesReducerBuilder = typesReducerBaseBuilder.spec({
  Foo: (n, r) => fooBarReducer(n, r),
  Bar: (n, r) => fooBarReducer(n, r),
});

test('swap-field-custom', ctx => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  let anyCalls = 0;
  const reducer = typesReducerBuilder.build({
    [ANY_KIND]: () => {
      anyCalls++;
    },
    Foo: (_, r) => {
      r.put('common', 'bye');
    },
  });

  const reduced = reducer.reduce(foo);

  ctx.expect(reduced).not.toBe(foo);
  ctx.expect(reduced).toBeDefined();
  ctx.expect(reduced?.common).toBe('bye');
  ctx.expect(anyCalls).toBe(0);
});

test('swap-field-custom-with-separated-any-spec', ctx => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  let anyCalls1 = 0;
  let anyCalls2 = 0;
  const reducer = typesReducerBuilder
    .spec({
      [ANY_KIND]: (_, r) => {
        anyCalls2++; // Never called, since 'Foo' will be matched first.
      },
      Foo: (_, r) => {
        r.put('common', 'bye');
      },
    })
    .build({
      [ANY_KIND]: (_, r) => {
        anyCalls1++;
        r.yieldBase();
      },
    });

  const reduced = reducer.reduce(foo);

  ctx.expect(reduced).not.toBe(foo);
  ctx.expect(reduced?.common).toBe('bye');
  ctx.expect(anyCalls1).toBe(1);
  ctx.expect(anyCalls2).toBe(0);
});

test('swap-object-custom', ctx => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};
  const foo2: Foo = {k: 'Foo', x: 20, y: 30, common: 'yo'};

  let anyCalls = 0;
  const reducer = typesReducerBuilder.build({
    [ANY_KIND]: () => anyCalls++,
    Foo: (_, r) => r.replace(foo2),
  });

  const reduced = reducer.reduce(foo);

  expectTs.toBeDefined(reduced);
  ctx.expect(reduced).not.toBe(foo);
  ctx.expect(reduced, 'Should be same, since we returned it as such (we say we manage it)').toBe(foo2);
  expectTs.propertyToBe(reduced, 'k', 'Foo');

  ctx.expect(reduced.x).toBe(20);
  ctx.expect(reduced.y).toBe(30);
  ctx.expect(reduced.common).toBe('yo');
  ctx.expect(anyCalls).toBe(0); // Not called, since `Foo` is matched
});

test('swap-object-and-field-custom', ctx => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};
  const foo2: Foo = {k: 'Foo', x: 34, y: 40, common: 'yo'};
  const bar: Bar = {k: 'Bar', a: 50, b: 60, common: 'hi'};

  let anyCalls = 0;
  const reducer = typesReducerBuilder.build({
    [ANY_KIND]: (_, r) => {
      anyCalls++;
      r.yieldBase();
    },
    Foo: (n, r) => r.replace(r.reduce((n === foo) ? foo2 : bar)),
  });

  const reduced = reducer.reduce(foo);

  ctx.expect(reduced).not.toBe(foo);
  ctx.expect(reduced, 'Should be same, since we returned it as such (we say we manage it)').toBe(bar);
  expectTs.propertyToBe(reduced, 'k', 'Bar');
  ctx.expect(reduced?.a).toBe(50);
  ctx.expect(reduced?.b).toBe(60);
  ctx.expect(reduced?.common).toBe('hi');
  ctx.expect(anyCalls).toBe(1);
});

test('swap-custom', ctx => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  const reducer = typesReducerBuilder.build({
    Foo: (n, r) => {
      r.put('common', 'bye'); // n.common = 'bye';
    },
  });

  const reduced = reducer.reduce(foo);

  ctx.expect(reduced).not.toBe(foo);
  ctx.expect(reduced?.common).toBe('bye');
});

test('reuse-branch', ctx => {

  const foo_common: Foo = {k: 'Foo', x: 666, y: 666};

  const foo211: Foo = {k: 'Foo', x: 211, y: 211, foo: foo_common};

  const foo111: Foo = {k: 'Foo', x: 111, y: 111, foo: foo_common};

  const foo21: Foo = {k: 'Foo', x: 21, y: 21, foo: foo211};

  const foo11: Foo = {k: 'Foo', x: 11, y: 11, foo: foo111};

  const foo1: Foo = {k: 'Foo', x: 1, y: 1, foo: foo11};
  const foo2: Foo = {k: 'Foo', x: 2, y: 2, foo: foo21};

  const bar: Bar = {k: 'Bar', a: 0, b: 0, foo: foo2};
  const foo: Foo = {k: 'Foo', x: 0, y: 0, foo: foo1, bar: bar};

  const reducerNoOp = typesReducerBuilder.build();

  ctx.expect(reducerNoOp.reduce(foo)).toBe(foo);

  const reducerIncrementX = typesReducerBuilder.build({
    Foo: (n, r) => {
      r.put('x', n.x + 1); // n.x++;
      // return n;
    },
  });

  const reduced = reducerIncrementX.reduce(foo);
  ctx.expect(reduced).not.toBe(foo);
});

test('increment-generation', ctx => {

  const foo: Foo = {k: 'Foo', x: 10, y: 10};

  const statsSource: ProxyReducerTrackingSource2 = {idCounter: 0, reducerIdCounter: 0};

  const reducerIncX = typesReducerBuilder.options({track: true, trackingStatsSource: statsSource}).build({
    Foo: (n, r) => r.put('x', n.x + 1),
  });

  const reducerIncY = typesReducerBuilder.options({track: true, trackingStatsSource: statsSource}).build({
    Foo: (n, r) => r.put('y', n.y + 1), // n.y++,
  });

  // Uses its own tracking source, that starts at 1_000
  const isolatedReducerDec10X = typesReducerBuilder.options({track: true, trackingStatsSource: {idCounter: 1_000, reducerIdCounter: 1_000}}).build({
    Foo: (n, r) => r.put('x', n.x - 10), // n.x -= 10,
  });

  // First increment x multiple time in sequence

  const xInc = reducerIncX.reduce(foo)!;
  const xInc2 = reducerIncX.reduce(xInc)!;
  const xInc3 = reducerIncX.reduce(xInc2)!;
  const xInc4 = reducerIncX.reduce(xInc3)!;

  ctx.expect(foo).not.toBe(xInc);
  ctx.expect(xInc).not.toBe(xInc2);
  ctx.expect(xInc2).not.toBe(xInc3);
  ctx.expect(xInc3).not.toBe(xInc4);

  ctx.expect(reducerIncX.getId(foo)).toEqual(5);
  ctx.expect(reducerIncX.getId(xInc)).toEqual(1);
  ctx.expect(reducerIncX.getId(xInc2)).toEqual(2);
  ctx.expect(reducerIncX.getId(xInc3)).toEqual(3);
  ctx.expect(reducerIncX.getId(xInc4)).toEqual(4);

  ctx.expect(ProxyReducer2.getReducerId(xInc)).toEqual(1);
  ctx.expect(ProxyReducer2.getReducerId(xInc2)).toEqual(1);
  ctx.expect(ProxyReducer2.getReducerId(xInc3)).toEqual(1);
  ctx.expect(ProxyReducer2.getReducerId(xInc4)).toEqual(1);

  ctx.expect(ProxyReducer2.getGeneration(xInc)).toEqual(1);
  ctx.expect(ProxyReducer2.getGeneration(xInc2)).toEqual(2);
  ctx.expect(ProxyReducer2.getGeneration(xInc3)).toEqual(3);
  ctx.expect(ProxyReducer2.getGeneration(xInc4)).toEqual(4);

  expectTs.propertyToBe(xInc, 'k', 'Foo');
  expectTs.propertyToBe(xInc2, 'k', 'Foo');
  expectTs.propertyToBe(xInc3, 'k', 'Foo');
  expectTs.propertyToBe(xInc4, 'k', 'Foo');

  ctx.expect(foo.x).toEqual(10);
  ctx.expect(xInc.x).toEqual(11);
  ctx.expect(xInc2.x).toEqual(12);
  ctx.expect(xInc3.x).toEqual(13);
  ctx.expect(xInc4.x).toEqual(14);

  // Then increment y for some of them individually

  const yInc = reducerIncY.reduce(foo)!;
  const yInc_xInc = reducerIncY.reduce(xInc)!;
  const yInc_xInc4 = reducerIncY.reduce(xInc4)!;
  const yInc_yInc_xInc4 = reducerIncY.reduce(yInc_xInc4)!;

  ctx.expect(foo).not.toBe(yInc);
  ctx.expect(xInc).not.toBe(yInc_xInc);
  ctx.expect(xInc4).not.toBe(yInc_xInc4);
  ctx.expect(yInc_xInc4).not.toBe(yInc_yInc_xInc4);

  expectTs.propertyToBe(yInc, 'k', 'Foo');
  expectTs.propertyToBe(yInc_xInc, 'k', 'Foo');
  expectTs.propertyToBe(yInc_xInc4, 'k', 'Foo');
  expectTs.propertyToBe(yInc_yInc_xInc4, 'k', 'Foo');

  ctx.expect(reducerIncX.getId(yInc)).toEqual(6);
  ctx.expect(reducerIncX.getId(yInc_xInc)).toEqual(7);
  ctx.expect(reducerIncX.getId(yInc_xInc4)).toEqual(8);
  ctx.expect(reducerIncX.getId(yInc_yInc_xInc4)).toEqual(9);

  ctx.expect(ProxyReducer2.getReducerId(yInc)).toEqual(2);
  ctx.expect(ProxyReducer2.getReducerId(yInc_xInc)).toEqual(2);
  ctx.expect(ProxyReducer2.getReducerId(yInc_yInc_xInc4)).toEqual(2);

  ctx.expect(ProxyReducer2.getGeneration(yInc)).toEqual(1);
  ctx.expect(ProxyReducer2.getGeneration(yInc_xInc)).toEqual(2);
  ctx.expect(ProxyReducer2.getGeneration(yInc_xInc4)).toEqual(5);
  ctx.expect(ProxyReducer2.getGeneration(yInc_yInc_xInc4)).toEqual(6);

  ctx.expect(yInc.x).toEqual(foo.x);
  ctx.expect(yInc.y).toEqual(11);

  ctx.expect(yInc_xInc.x).toEqual(xInc.x);
  ctx.expect(yInc_xInc.y).toEqual(11);

  ctx.expect(yInc_xInc4.x).toEqual(xInc4.x);
  ctx.expect(yInc_xInc4.y).toEqual(11);

  ctx.expect(yInc_yInc_xInc4.x).toEqual(xInc4.x);
  ctx.expect(yInc_yInc_xInc4.y).toEqual(12);

  // Then we run another reducer with isolated stats, which will give other tracking

  const xDec = isolatedReducerDec10X.reduce(foo)!;
  const xDec_yInc_xInc = isolatedReducerDec10X.reduce(yInc_xInc)!;
  const xDec_yInc_yInc_xInc4 = isolatedReducerDec10X.reduce(yInc_yInc_xInc4)!;

  ctx.expect(foo).not.toBe(xDec);
  ctx.expect(yInc_xInc).not.toBe(xDec_yInc_xInc);
  ctx.expect(yInc_yInc_xInc4).not.toBe(xDec_yInc_yInc_xInc4);

  expectTs.propertyToBe(xDec, 'k', 'Foo');
  expectTs.propertyToBe(xDec_yInc_xInc, 'k', 'Foo');
  expectTs.propertyToBe(xDec_yInc_yInc_xInc4, 'k', 'Foo');

  ctx.expect(reducerIncX.getId(xDec)).toEqual(1001);
  ctx.expect(reducerIncX.getId(xDec_yInc_xInc)).toEqual(1002);
  ctx.expect(reducerIncX.getId(xDec_yInc_yInc_xInc4)).toEqual(1003);

  ctx.expect(ProxyReducer2.getReducerId(xDec)).toEqual(1001);
  ctx.expect(ProxyReducer2.getReducerId(xDec_yInc_xInc)).toEqual(1001);
  ctx.expect(ProxyReducer2.getReducerId(xDec_yInc_yInc_xInc4)).toEqual(1001);

  ctx.expect(ProxyReducer2.getGeneration(xDec)).toEqual(1);
  ctx.expect(ProxyReducer2.getGeneration(xDec_yInc_xInc)).toEqual(3);
  ctx.expect(ProxyReducer2.getGeneration(xDec_yInc_yInc_xInc4)).toEqual(7);

  ctx.expect(xDec.x).toEqual(0);
  ctx.expect(xDec.y).toEqual(foo.y);

  ctx.expect(xDec_yInc_xInc.x).toEqual(1);
  ctx.expect(xDec_yInc_xInc.y).toEqual(yInc_xInc.y);

  ctx.expect(xDec_yInc_yInc_xInc4.x).toEqual(4);
  ctx.expect(xDec_yInc_yInc_xInc4.y).toEqual(yInc_yInc_xInc4.y);
});

test('track-multiple-reducers', ctx => {

  const foo: Foo = {k: 'Foo', x: 10, y: 10};

  const statsSource: ProxyReducerTrackingSource2 = {idCounter: 0, reducerIdCounter: 0};

  const reducerIncX = typesReducerBuilder.options({track: true, trackingStatsSource: statsSource}).build({
    Foo: (n, r) => r.put('x', n.x + 1),
  });

  const reducerIncY = typesReducerBuilder.options({track: ProxyReducerTrackMode2.MULTIPLE, trackingStatsSource: statsSource}).build({
    Foo: (n, r) => r.put('y', n.y + 1),
  });

  const xInc = reducerIncX.reduce(foo)!;
  const yInc_xInc = reducerIncY.reduce(xInc)!;
  const xInc_yInc_xInc = reducerIncX.reduce(yInc_xInc)!;

  ctx.expect(ProxyReducer2.getReducerId(foo)).toBeUndefined();
  ctx.expect(ProxyReducer2.getReducerId(xInc)).toEqual(1);
  ctx.expect(ProxyReducer2.getReducerId(yInc_xInc)).toEqual([1, 2]);
  ctx.expect(ProxyReducer2.getReducerId(xInc_yInc_xInc)).toEqual(1); // Overwrites with LAST again.
});

describe('non-local-deep-change-not-recursive', () => {

  const foo3: Foo = {k: 'Foo', x: 5, y: 55};
  const foo2_2: Foo = {k: 'Foo', x: 4, y: 44, foo: foo3};
  const foo1_1: Foo = {k: 'Foo', x: 3, y: 33, foos: [foo3]};
  const foo2: Foo = {k: 'Foo', x: 2, y: 22, foo: foo2_2};
  const foo1: Foo = {k: 'Foo', x: 1, y: 11, foos: [foo1_1]};

  const root: Foo = {k: 'Foo', x: 0, y: 0, common: 'root', foos: [foo1, foo2]};

  test('stop-visiting', ctx => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => {
        if (n.x === 3 && n.foos && n.foos[0].x === 5) {
          r.put('foo', {k: 'Foo', x: 123, y: 123, foo: n.foos[0]}).put('foos', undefined);
        } else if (n.x === 5) {
          r.put('x', n.x + 1);
        } else {
          r.yieldBase();
        }
      },
    });

    const reduced = reducer.reduce(root);

    ctx.expect(reduced).not.toBe(root);
    ctx.expect(reduced.foos![0].x).toEqual(1);
    ctx.expect(reduced.foos![0].foos![0].x).toEqual(3);
    ctx.expect(reduced.foos![0].foos![0].foos).toBeUndefined();
    ctx.expect(reduced.foos![0].foos![0].foo?.x).toEqual(123);

    ctx.expect(reduced.foos![0].foos![0].foo?.foo?.x).toEqual(5); // 5, since we stopped visiting
    ctx.expect(reduced.foos![1].foo?.foo?.x).toEqual(6); // 6, since this was a regular visit
  });

  test('keep-visiting-without-recursive-persist', ctx => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => {
        if (n.x === 3 && n.foos && n.foos[0].x === 5) {
          r.put('foo', {k: 'Foo', x: 123, y: 123, foo: n.foos[0]}).put('foos', undefined).yieldBase();
        } else if (n.x === 5) {
          r.put('x', n.x + 1);
        } else {
          r.yieldBase();
        }
      },
    });

    const reduced = reducer.reduce(root);

    ctx.expect(reduced).not.toBe(root);

    ctx.expect(reduced.foos![0].foos![0].foo?.foo?.x).toEqual(6);
    ctx.expect(reduced.foos![1].foo?.foo?.x).toEqual(6);

    // Every reduction of `foo3` will become a unique object.
    ctx.expect(reduced.foos![0].foos![0].foo?.foo).not.toBe(reduced.foos![1].foo?.foo);
  });

  test('keep-visiting-WITH-recursive-persist', ctx => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => {
        if (n.x === 3 && n.foos && n.foos[0].x === 5) {
          r.put('foo', {k: 'Foo', x: 123, y: 123, foo: n.foos[0]}).put('foos', undefined).yieldBase();
        } else if (n.x === 5) {
          r.put('x', n.x + 1).persist(); // .commit();
        } else {
          r.yieldBase();
        }
      },
    });

    const reduced = reducer.reduce(root);

    ctx.expect(reduced).not.toBe(root);

    ctx.expect(reduced.foos![0].foos![0].foo?.foo?.x).toEqual(6);
    ctx.expect(reduced.foos![1].foo?.foo?.x).toEqual(6);

    ctx.expect(reduced.foos![0].foos![0].foo?.foo).toBe(reduced.foos![1].foo?.foo);
  });
});

describe('non-local-deep-change-recursive', () => {

  const edge_1_to_root: Foo = {k: 'Foo', x: 30, y: 30, common: 'edge', foos: []};

  const root_branch_1: Foo = {k: 'Foo', x: 20, y: 20, common: 'branch', foos: [edge_1_to_root]};
  const root_branch_2: Foo = {k: 'Foo', x: 10, y: 10, common: 'branch', foos: [edge_1_to_root]};

  const root: Foo = {k: 'Foo', x: 0, y: 0, common: 'root', foos: [root_branch_1, root_branch_2]};

  edge_1_to_root.foos!.push(root);
  root_branch_1.foos!.push(root);
  root_branch_2.foos!.push(root);

  test.skip('no-change', ctx => {
    const reduced = typesReducerBuilder.build().reduce(root);
    ctx.expect(reduced).toBe(root);
  });

  test.skip('no-change-empty-spec', ctx => {
    const reduced = typesReducerBuilder.build({}).reduce(root);
    ctx.expect(reduced).toBe(root);
  });

  test('change-no-next', ctx => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => r.put('x', n.x + 1),
    });

    const reduced = reducer.reduce(root);
    ctx.expect(reduced).not.toBe(root);
    ctx.expect(reduced.foos![0]).toBe(root.foos![0]);
    ctx.expect(reduced.foos![1]).toBe(root.foos![1]);
  });

  test('change-with-next', ctx => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => r.put('x', n.x + 1).yieldBase(),
    });

    const reduced = reducer.reduce(root);
    ctx.expect(reduced.foos![0]).not.toBe(root.foos![0]);
    ctx.expect(reduced.foos![1]).not.toBe(root.foos![1]);

    ctx.expect(reduced.foos![0].foos![1]).toBe(reduced);
    ctx.expect(reduced.foos![1].foos![1]).toBe(reduced);

    ctx.expect(reduced.foos![0].foos![0].foos![0]).toBe(reduced);
    ctx.expect(reduced.foos![1].foos![0].foos![0]).toBe(reduced);
  });
});

describe('struct-recursive', () => {

  const baz1: Baz = {k: 'Baz', v: 1};
  const baz2: Baz = {k: 'Baz', v: '2'};
  const foo1: Foo = {k: 'Foo', x: 1, y: 11, common: 'hello1', baz: baz1};
  const foo2: Foo = {k: 'Foo', x: 2, y: 22, common: 'hello2', foo: foo1, baz: baz2};
  const bar1: Bar = {k: 'Bar', a: 1, b: 11, foo: foo2};
  const bar2: Bar = {k: 'Bar', a: 2, b: 22, foo: foo1, bar: bar1};

  test('struct-recursive_reducer-!recursive', ctx => {

    const reducer = typesReducerBuilder.build({
      Foo: (_, r) => r.put('common', 'bye').put('x', c => c.x + 1),
    });

    const reduced = reducer.reduce(bar2);

    ctx.expect(reduced).not.toBe(bar2);
    ctx.expect(reduced?.foo?.common).toEqual('bye');
    ctx.expect(reduced?.foo?.x).toEqual(2);
    ctx.expect(reduced?.foo?.y).toEqual(11);
    ctx.expect(reduced?.foo?.baz?.v).toEqual(1);
    ctx.expect(reduced?.bar?.foo?.foo?.common).toEqual('hello1'); // Kept, since Foo reducer does not recurse
    ctx.expect(reduced?.bar?.foo?.x).toEqual(3); // Changed, since Foo inside Bar is recursed into
    ctx.expect(reduced?.bar?.foo?.y).toEqual(22);
  });

  test('struct-recursive_reducer-recursive', ctx => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => {

        // First we change some properties, then do the "default" reducing.
        const common = n.common ?? '';
        r.put('common', 'bye' + common.substring(common.length - 1));
        r.put('x', n.x + 1).yieldBase();
      },
    });

    const reduced = reducer.reduce(bar2);

    ctx.expect(reduced).not.toBe(bar2);
    ctx.expect(reduced?.foo?.common).toEqual('bye1');
    ctx.expect(reduced?.foo?.x).toEqual(2);
    ctx.expect(reduced?.foo?.y).toEqual(11);
    ctx.expect(reduced?.foo?.baz?.v).toEqual(1);
    ctx.expect(reduced?.bar?.foo?.common).toEqual('bye2');
    ctx.expect(reduced?.bar?.foo?.foo?.common).toEqual('bye1');
    ctx.expect(reduced?.bar?.foo?.x).toEqual(3);
    ctx.expect(reduced?.bar?.foo?.y).toEqual(22);
  });
});
