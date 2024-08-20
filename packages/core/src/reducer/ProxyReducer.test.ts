import {describe, expect, test} from 'vitest';
import {ProxyReducer} from './ProxyReducer.ts';
import {assertDiscriminator, expectTs, isDefined} from '../util';
import {ProxyReducerTrackMode} from './proxyReducerTrackMode.ts';
import {SpecFn} from './types.ts';
import {ProxyReducerTrackingSource} from './ProxyReducerTrackingSource.ts';

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

const typesReducerBaseBuilder = ProxyReducer.builder<Types, TypesOverride>().discriminator('k').options({immutable: false});

const fooBarReducer: SpecFn<Types, Foo | Bar, 'k', TypesOverride, { immutable: false }> = (n, r) => {
  if (n.foo) {
    const reduced = r.next(n.foo);
    if (reduced.k === 'Foo') {
      n.foo = reduced;
    } else {
      n.bar = reduced;
    }
  }
  if (n.bar) n.bar = r.next(n.bar);
  if (n.baz) n.baz = r.next(n.baz);
  if (n.foos) n.foos = n.foos.map(it => r.next(it)).filter(isDefined).filter(it => it.k === 'Foo');
  if (n.bars) n.bars = n.bars.map(it => r.next(it)).filter(isDefined).filter(it => it.k === 'Bar');
  return n;
};

const typesReducerBuilder = typesReducerBaseBuilder.spec({
  Foo: (n, r) => fooBarReducer(n, r) ?? undefined,
  Bar: (n, r) => {
    const reduced = fooBarReducer(n, r);
    return reduced ? assertDiscriminator(reduced, 'k', 'Bar') : undefined;
  },
});

test('swap-field-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  let anyCalls = 0;
  const reducer = typesReducerBuilder.build({
    true: () => {
      anyCalls++;
    },
    Foo: n => {
      n.common = 'bye';
    },
  });

  const reduced = reducer.reduce(foo);

  expect(reduced).not.toBe(foo);
  expect(reduced?.common).toBe('bye');
  expect(anyCalls).toBe(0);
});

test('swap-field-custom-with-separated-any-spec', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  let anyCalls1 = 0;
  let anyCalls2 = 0;
  const reducer = typesReducerBuilder
    .spec({
      true: () => {
        anyCalls2++; // Never called, since 'Foo' will be matched first.
      },
      Foo: n => {
        n.common = 'bye';
      },
    })
    .build({
      true: (n, r) => {
        anyCalls1++;
        return r.next(n);
      },
    });

  const reduced = reducer.reduce(foo);

  expect(reduced).not.toBe(foo);
  expect(reduced?.common).toBe('bye');
  expect(anyCalls1).toBe(1);
  expect(anyCalls2).toBe(0);
});

test('swap-object-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};
  const foo2: Foo = {k: 'Foo', x: 20, y: 30, common: 'yo'};

  let anyCalls = 0;
  const reducer = typesReducerBuilder.build({
    true: () => {
      anyCalls++;
    },
    Foo: () => foo2,
  });

  const reduced = reducer.reduce(foo);

  expectTs.toBeDefined(reduced);
  expect(reduced).not.toBe(foo);
  expect(reduced, 'Should be same, since we returned it as such (we say we manage it)').toBe(foo2);
  expectTs.propertyToBe(reduced, 'k', 'Foo');

  expect(reduced.x).toBe(20);
  expect(reduced.y).toBe(30);
  expect(reduced.common).toBe('yo');
  expect(anyCalls).toBe(0); // Not called, since `Foo` is matched
});

test('swap-object-and-field-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};
  const foo2: Foo = {k: 'Foo', x: 34, y: 40, common: 'yo'};
  const bar: Bar = {k: 'Bar', a: 50, b: 60, common: 'hi'};

  let anyCalls = 0;
  const reducer = typesReducerBuilder.build({
    true: () => {
      anyCalls++;
    },
    Foo: n => {
      if (n === foo) {
        return foo2;
      }

      return bar;
    },
  });

  const reduced = reducer.reduce(foo);

  expectTs.toBeDefined(reduced);
  expect(reduced).not.toBe(foo);
  expect(reduced, 'Should be same, since we returned it as such (we say we manage it)').toBe(bar);
  expectTs.propertyToBe(reduced, 'k', 'Bar');
  expect(reduced?.a).toBe(50);
  expect(reduced?.b).toBe(60);
  expect(reduced?.common).toBe('hi');
  expect(anyCalls).toBe(1);
});

test('swap-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  const reducer = typesReducerBuilder.build({
    Foo: n => {
      n.common = 'bye';
    },
  });

  const reduced = reducer.reduce(foo);

  expect(reduced).not.toBe(foo);
  expect(reduced?.common).toBe('bye');
});

test('reuse-branch', () => {

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

  expect(reducerNoOp.reduce(foo)).toBe(foo);

  const reducerIncrementX = typesReducerBuilder.build({
    Foo: n => {
      n.x++;
    },
  });

  const reduced = reducerIncrementX.reduce(foo);
  expect(reduced).not.toBe(foo);
});

test('increment-generation', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 10};

  const statsSource: ProxyReducerTrackingSource = {idCounter: 0, reducerIdCounter: 0};

  const reducerIncX = typesReducerBuilder.options({track: true, trackingStatsSource: statsSource}).build({
    Foo: n => {
      n.x++;
    },
  });

  const reducerIncY = typesReducerBuilder.options({track: true, trackingStatsSource: statsSource}).build({
    Foo: n => {
      n.y++;
    },
  });

  // Uses its own tracking source, that starts at 1_000
  const isolatedReducerDec10X = typesReducerBuilder.options({track: true, trackingStatsSource: {idCounter: 1_000, reducerIdCounter: 1_000}}).build({
    Foo: n => {
      n.x -= 10;
    },
  });

  // First increment x multiple time in sequence

  const xInc = reducerIncX.reduce(foo)!;
  const xInc2 = reducerIncX.reduce(xInc)!;
  const xInc3 = reducerIncX.reduce(xInc2)!;
  const xInc4 = reducerIncX.reduce(xInc3)!;

  expect(foo).not.toBe(xInc);
  expect(xInc).not.toBe(xInc2);
  expect(xInc2).not.toBe(xInc3);
  expect(xInc3).not.toBe(xInc4);

  expect(ProxyReducer.getId(foo)).toBeUndefined();
  expect(ProxyReducer.getId(xInc)).toEqual(1);
  expect(ProxyReducer.getId(xInc2)).toEqual(2);
  expect(ProxyReducer.getId(xInc3)).toEqual(3);
  expect(ProxyReducer.getId(xInc4)).toEqual(4);

  expect(ProxyReducer.getReducerId(xInc)).toEqual(1);
  expect(ProxyReducer.getReducerId(xInc2)).toEqual(1);
  expect(ProxyReducer.getReducerId(xInc3)).toEqual(1);
  expect(ProxyReducer.getReducerId(xInc4)).toEqual(1);

  expect(ProxyReducer.getGeneration(xInc)).toEqual(1);
  expect(ProxyReducer.getGeneration(xInc2)).toEqual(2);
  expect(ProxyReducer.getGeneration(xInc3)).toEqual(3);
  expect(ProxyReducer.getGeneration(xInc4)).toEqual(4);

  expectTs.propertyToBe(xInc, 'k', 'Foo');
  expectTs.propertyToBe(xInc2, 'k', 'Foo');
  expectTs.propertyToBe(xInc3, 'k', 'Foo');
  expectTs.propertyToBe(xInc4, 'k', 'Foo');

  expect(foo.x).toEqual(10);
  expect(xInc.x).toEqual(11);
  expect(xInc2.x).toEqual(12);
  expect(xInc3.x).toEqual(13);
  expect(xInc4.x).toEqual(14);

  // Then increment y for some of them individually

  const yInc = reducerIncY.reduce(foo)!;
  const yInc_xInc = reducerIncY.reduce(xInc)!;
  const yInc_xInc4 = reducerIncY.reduce(xInc4)!;
  const yInc_yInc_xInc4 = reducerIncY.reduce(yInc_xInc4)!;

  expect(foo).not.toBe(yInc);
  expect(xInc).not.toBe(yInc_xInc);
  expect(xInc4).not.toBe(yInc_xInc4);
  expect(yInc_xInc4).not.toBe(yInc_yInc_xInc4);

  expectTs.propertyToBe(yInc, 'k', 'Foo');
  expectTs.propertyToBe(yInc_xInc, 'k', 'Foo');
  expectTs.propertyToBe(yInc_xInc4, 'k', 'Foo');
  expectTs.propertyToBe(yInc_yInc_xInc4, 'k', 'Foo');

  expect(ProxyReducer.getId(yInc)).toEqual(5);
  expect(ProxyReducer.getId(yInc_xInc)).toEqual(6);
  expect(ProxyReducer.getId(yInc_xInc4)).toEqual(7);
  expect(ProxyReducer.getId(yInc_yInc_xInc4)).toEqual(8);

  expect(ProxyReducer.getReducerId(yInc)).toEqual(2);
  expect(ProxyReducer.getReducerId(yInc_xInc)).toEqual(2);
  expect(ProxyReducer.getReducerId(yInc_yInc_xInc4)).toEqual(2);

  expect(ProxyReducer.getGeneration(yInc)).toEqual(1);
  expect(ProxyReducer.getGeneration(yInc_xInc)).toEqual(2);
  expect(ProxyReducer.getGeneration(yInc_xInc4)).toEqual(5);
  expect(ProxyReducer.getGeneration(yInc_yInc_xInc4)).toEqual(6);

  expect(yInc.x).toEqual(foo.x);
  expect(yInc.y).toEqual(11);

  expect(yInc_xInc.x).toEqual(xInc.x);
  expect(yInc_xInc.y).toEqual(11);

  expect(yInc_xInc4.x).toEqual(xInc4.x);
  expect(yInc_xInc4.y).toEqual(11);

  expect(yInc_yInc_xInc4.x).toEqual(xInc4.x);
  expect(yInc_yInc_xInc4.y).toEqual(12);

  // Then we run another reducer with isolated stats, which will give other tracking

  const xDec = isolatedReducerDec10X.reduce(foo)!;
  const xDec_yInc_xInc = isolatedReducerDec10X.reduce(yInc_xInc)!;
  const xDec_yInc_yInc_xInc4 = isolatedReducerDec10X.reduce(yInc_yInc_xInc4)!;

  expect(foo).not.toBe(xDec);
  expect(yInc_xInc).not.toBe(xDec_yInc_xInc);
  expect(yInc_yInc_xInc4).not.toBe(xDec_yInc_yInc_xInc4);

  expectTs.propertyToBe(xDec, 'k', 'Foo');
  expectTs.propertyToBe(xDec_yInc_xInc, 'k', 'Foo');
  expectTs.propertyToBe(xDec_yInc_yInc_xInc4, 'k', 'Foo');

  expect(ProxyReducer.getId(xDec)).toEqual(1001);
  expect(ProxyReducer.getId(xDec_yInc_xInc)).toEqual(1002);
  expect(ProxyReducer.getId(xDec_yInc_yInc_xInc4)).toEqual(1003);

  expect(ProxyReducer.getReducerId(xDec)).toEqual(1001);
  expect(ProxyReducer.getReducerId(xDec_yInc_xInc)).toEqual(1001);
  expect(ProxyReducer.getReducerId(xDec_yInc_yInc_xInc4)).toEqual(1001);

  expect(ProxyReducer.getGeneration(xDec)).toEqual(1);
  expect(ProxyReducer.getGeneration(xDec_yInc_xInc)).toEqual(3);
  expect(ProxyReducer.getGeneration(xDec_yInc_yInc_xInc4)).toEqual(7);

  expect(xDec.x).toEqual(0);
  expect(xDec.y).toEqual(foo.y);

  expect(xDec_yInc_xInc.x).toEqual(1);
  expect(xDec_yInc_xInc.y).toEqual(yInc_xInc.y);

  expect(xDec_yInc_yInc_xInc4.x).toEqual(4);
  expect(xDec_yInc_yInc_xInc4.y).toEqual(yInc_yInc_xInc4.y);
});

test('track-multiple-reducers', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 10};

  const statsSource: ProxyReducerTrackingSource = {idCounter: 0, reducerIdCounter: 0};

  const reducerIncX = typesReducerBuilder.options({track: true, trackingStatsSource: statsSource}).build({
    Foo: n => {
      n.x++;
    },
  });

  const reducerIncY = typesReducerBuilder.options({track: ProxyReducerTrackMode.MULTIPLE, trackingStatsSource: statsSource}).build({
    Foo: n => {
      n.y++;
    },
  });

  const xInc = reducerIncX.reduce(foo)!;
  const yInc_xInc = reducerIncY.reduce(xInc)!;
  const xInc_yInc_xInc = reducerIncX.reduce(yInc_xInc)!;

  expect(ProxyReducer.getReducerId(foo)).toBeUndefined();
  expect(ProxyReducer.getReducerId(xInc)).toEqual(1);
  expect(ProxyReducer.getReducerId(yInc_xInc)).toEqual([1, 2]);
  expect(ProxyReducer.getReducerId(xInc_yInc_xInc)).toEqual(1); // Overwrites with LAST again.
});

describe('non-local-deep-change-not-recursive', () => {

  const foo3: Foo = {k: 'Foo', x: 5, y: 55};
  const foo2_2: Foo = {k: 'Foo', x: 4, y: 44, foo: foo3};
  const foo1_1: Foo = {k: 'Foo', x: 3, y: 33, foos: [foo3]};
  const foo2: Foo = {k: 'Foo', x: 2, y: 22, foo: foo2_2};
  const foo1: Foo = {k: 'Foo', x: 1, y: 11, foos: [foo1_1]};

  const root: Foo = {k: 'Foo', x: 0, y: 0, common: 'root', foos: [foo1, foo2]};

  test('stop-visiting', () => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => {
        if (n.x === 3 && n.foos && n.foos[0].x === 5) {
          n.foo = {k: 'Foo', x: 123, y: 123, foo: n.foos[0]};
          n.foos = undefined;
          return n;
        } else if (n.x === 5) {
          n.x++;
          return n;
        } else {
          return r.next(n);
        }
      },
    });

    const reduced = reducer.reduce(root);

    expect(reduced).not.toBe(root);
    expect(reduced.foos![0].x).toEqual(1);
    expect(reduced.foos![0].foos![0].x).toEqual(3);
    expect(reduced.foos![0].foos![0].foos).toBeUndefined();
    expect(reduced.foos![0].foos![0].foo?.x).toEqual(123);

    expect(reduced.foos![0].foos![0].foo?.foo?.x).toEqual(5); // 5, since we stopped visiting
    expect(reduced.foos![1].foo?.foo?.x).toEqual(6); // 6, since this was a regular visit
  });

  test('keep-visiting', () => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => {
        if (n.x === 3 && n.foos && n.foos[0].x === 5) {
          n.foo = {k: 'Foo', x: 123, y: 123, foo: n.foos[0]};
          n.foos = undefined;
          return r.next(n);
        } else if (n.x === 5) {
          n.x++;
          return n;
        } else {
          return r.next(n);
        }
      },
    });

    const reduced = reducer.reduce(root);

    expect(reduced).not.toBe(root);

    expect(reduced.foos![0].foos![0].foo?.foo?.x).toEqual(6);
    expect(reduced.foos![1].foo?.foo?.x).toEqual(6);

    expect(reduced.foos![0].foos![0].foo?.foo).toBe(reduced.foos![1].foo?.foo);
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

  test('no-change', () => {

    const reducer = typesReducerBuilder.build({

    });

    const reduced = reducer.reduce(root);
    expect(reduced).toBe(root);
  });

  test('change-no-next', () => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => {
        n.x++;
      },
    });

    const reduced = reducer.reduce(root);
    expect(reduced).not.toBe(root);
    expect(reduced.foos![0]).toBe(root.foos![0]);
    expect(reduced.foos![1]).toBe(root.foos![1]);
  });

  test('change-with-next', () => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, r) => {
        n.x++;
        return r.next(n);
      },
    });

    const reduced = reducer.reduce(root);
    expect(reduced.foos![0]).not.toBe(root.foos![0]);
    expect(reduced.foos![1]).not.toBe(root.foos![1]);

    expect(reduced.foos![0].foos![1]).toBe(reduced);
    expect(reduced.foos![1].foos![1]).toBe(reduced);

    expect(reduced.foos![0].foos![0].foos![0]).toBe(reduced);
    expect(reduced.foos![1].foos![0].foos![0]).toBe(reduced);
  });

});

describe('struct-recursive', () => {

  const baz1: Baz = {k: 'Baz', v: 1};
  const baz2: Baz = {k: 'Baz', v: '2'};
  const foo1: Foo = {k: 'Foo', x: 1, y: 11, common: 'hello1', baz: baz1};
  const foo2: Foo = {k: 'Foo', x: 2, y: 22, common: 'hello2', foo: foo1, baz: baz2};
  const bar1: Bar = {k: 'Bar', a: 1, b: 11, foo: foo2};
  const bar2: Bar = {k: 'Bar', a: 2, b: 22, foo: foo1, bar: bar1};

  test('struct-recursive_reducer-!recursive', () => {

    const reducer = typesReducerBuilder.build({
      Foo: n => {
        n.common = 'bye';
        n.x++;
      },
    });

    const reduced = reducer.reduce(bar2);

    expect(reduced).not.toBe(bar2);
    expect(reduced?.foo?.common).toEqual('bye');
    expect(reduced?.foo?.x).toEqual(2);
    expect(reduced?.foo?.y).toEqual(11);
    expect(reduced?.foo?.baz?.v).toEqual(1);
    expect(reduced?.bar?.foo?.foo?.common).toEqual('hello1'); // Kept, since Foo reducer does not recurse
    expect(reduced?.bar?.foo?.x).toEqual(3); // Changed, since Foo inside Bar is recursed into
    expect(reduced?.bar?.foo?.y).toEqual(22);
  });

  test('struct-recursive_reducer-recursive', () => {

    const reducer = typesReducerBuilder.build({
      Foo: (n, a) => {

        // First we change some properties, then do the "default" reducing.
        const common = n.common ?? '';
        n.common = 'bye' + common.substring(common.length - 1);
        n.x++;
        return a.next(n);
      },
    });

    const reduced = reducer.reduce(bar2);

    expect(reduced).not.toBe(bar2);
    expect(reduced?.foo?.common).toEqual('bye1');
    expect(reduced?.foo?.x).toEqual(2);
    expect(reduced?.foo?.y).toEqual(11);
    expect(reduced?.foo?.baz?.v).toEqual(1);
    expect(reduced?.bar?.foo?.common).toEqual('bye2');
    expect(reduced?.bar?.foo?.foo?.common).toEqual('bye1');
    expect(reduced?.bar?.foo?.x).toEqual(3);
    expect(reduced?.bar?.foo?.y).toEqual(22);
  });
});


