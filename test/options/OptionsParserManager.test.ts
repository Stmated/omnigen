import {LoggerUtils} from '..';

LoggerUtils.registerLoggerFix();

import {LoggerFactory} from '@util';
import {Booleanish, IncomingOptions, IncomingOrRealOption, IOptions} from '@options';
import {OptionsUtil} from '@options';

export const logger = LoggerFactory.create(__filename);

export interface AOptions extends IOptions {
  foo: IncomingOrRealOption<Booleanish, boolean>;
  bar: string;
  qwe: IncomingOrRealOption<string | number, string>;
}

export interface BoolOptions extends IOptions {
  a: IncomingOrRealOption<string, boolean>;
  b: IncomingOrRealOption<number, boolean>;
  c: IncomingOrRealOption<boolean, boolean>;
}

export interface NoDynamicOptions extends IOptions {
  a: string;
  b: number;
  c: boolean;
}

describe('OptionsParserManager', () => {

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

    const converted = input.map(it => OptionsUtil.toBoolean(it));

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

    const override: IncomingOptions<AOptions> = {
      bar: 'barrrr',
    };

    const inc1: IncomingOptions<AOptions> = {
      foo: '0',
    };

    const inc2: IncomingOptions<AOptions> = {
      qwe: 2
    };

    const real = await OptionsUtil.updateOptions(base, {...inc1, ...inc2}, {
      foo: OptionsUtil.toBoolean,
      qwe: OptionsUtil.toString
    }, {
      foo: value => value ? undefined : override
    });

    expect(real).toBeDefined();
    expect(real.foo).toEqual(false);
    expect(real.bar).toEqual('barrrr');
    expect(real.qwe).toEqual('2');
  });

});
