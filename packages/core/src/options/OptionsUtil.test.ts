import {Booleanish, IncomingOptions, Option, Options, OptionsUtil, RealOptions} from '../options/index.js';

interface AOptions extends Options {
  foo: Option<Booleanish, boolean>;
  bar: string;
  qwe: Option<string | number, string>;
}

interface BoolOptions extends Options {
  a: Option<string, boolean>;
  b: Option<number, boolean>;
  c: Option<boolean, boolean>;
}

interface NoDynamicOptions extends Options {
  a: string;
  b: number;
  c: boolean;
}

interface OverlappingOptions extends Options {
  a: Option<string | undefined, string>;
  b: Option<string | undefined, string | null>;
  c: string;
}

// const a: OverlappingOptions = {
//   a: undefined,
//   b: null,
//   c: '',
// };
//
// const b: IncomingOptions<OverlappingOptions> = {
//   a: undefined,
//   b: undefined,
//   c: '',
// };
//
// const c: RealOptions<OverlappingOptions> = {
//   a: undefined,
//   b: 'qwe',
//   c: '',
// };

test('Booleanish', async () => {

  const input: Booleanish[] = [
    true,
    false,
    'true',
    'false',
    't',
    'f',
    'yes',
    'no',
    'y',
    'n',
    '1',
    '0',
    '5',
    'b',
    '',
    '...',
    'something',
  ];

  const converted = await Promise.all(input.map(it => OptionsUtil.toBoolean(it)));

  expect(converted).toEqual([
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    false,
    false,
    false,
  ]);
});

test('Booleans', async () => {

  const base: BoolOptions = {
    a: 'true',
    b: 1,
    c: true,
  };

  const inc1: IncomingOptions<BoolOptions> = {
    b: 0, // Checks that the incoming value is used even though "false-ish"
  };

  const real = await OptionsUtil.updateOptions(base, inc1, {
    a: OptionsUtil.toBoolean,
    b: OptionsUtil.toBoolean,
    c: OptionsUtil.toBoolean,
  });

  expect(real.a).toEqual(true);
  expect(real.b).toEqual(false);
  expect(real.c).toEqual(true);
});

test('NoDynamics', async () => {

  const base: NoDynamicOptions = {
    a: 'string',
    b: 1,
    c: true,
  };

  const inc1: IncomingOptions<NoDynamicOptions> = {
    a: 'replacement',
  };

  const real = await OptionsUtil.updateOptions(base, inc1);

  expect(real).toBeDefined();
  expect(real.a).toEqual('replacement');
  expect(real.b).toEqual(1);
  expect(real.c).toEqual(true);
});

test('Additions', async () => {

  const base: AOptions = {
    foo: 'true',
    bar: 'bar',
    qwe: 'qwe',
  };

  const override: Partial<RealOptions<AOptions>> = {
    bar: 'barrrr',
  };

  const inc1: IncomingOptions<AOptions> = {
    foo: '0',
  };

  const inc2: IncomingOptions<AOptions> = {
    qwe: 2,
  };

  const real = await OptionsUtil.updateOptions(base, {...inc1, ...inc2}, {
    foo: OptionsUtil.toBoolean,
    qwe: OptionsUtil.toString,
  }, {
    foo: value => value ? undefined : override,
  });

  expect(real).toBeDefined();
  expect(real.foo).toEqual(false);
  expect(real.bar).toEqual('barrrr');
  expect(real.qwe).toEqual('2');
});
