import {LoggerUtils} from '..';

LoggerUtils.registerLoggerFix();

import {LoggerFactory} from '@util';
import {Booleanish, IncomingOptions, IncomingOrRealOption, IOptions} from '../../src/options';
import {OptionsUtil} from '../../src/options/OptionsUtil';

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

    const real = OptionsUtil.updateOptions(base, inc1, {
      a: OptionsUtil.toBoolean,
      b: OptionsUtil.toBoolean,
      c: OptionsUtil.toBoolean,
    });

    expect(real.a).toEqual(true);
    expect(real.b).toEqual(false);
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

    const real = OptionsUtil.updateOptions(base, {...inc1, ...inc2}, {
      foo: OptionsUtil.toBoolean,
      qwe: (v) => String(v)
    }, {
      foo: value => value ? undefined : override
    });

    expect(real).toBeDefined();
    expect(real.foo).toEqual(false);
    expect(real.bar).toEqual('barrrr');
    expect(real.qwe).toEqual('2');
  });

});
