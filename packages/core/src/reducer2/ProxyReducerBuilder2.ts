import {Environment, StrictReadonly} from '@omnigen/api';
import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2';
import {ANY_KIND, Spec2, SpecFn2} from './types';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2';
import {ReducerOpt2} from './ReducerOpt2';
import {Options2, ProxyReducer2} from './ProxyReducer2';

const GLOBAL_TRACKING_STATS: ProxyReducerTrackingSource2 = {
  idCounter: 0,
  reducerIdCounter: 0,
};

export type ProxyReducerDiscriminatorBuilder<N extends object, O> = {
  discriminator: <const D extends keyof N>(d: D) => ProxyReducerOptionsBuilder<N, D, O, {}>;
}

export class ProxyReducerOptionsBuilder<N extends object, const D extends keyof N, O, Opt extends ReducerOpt2> {

  private readonly _discriminator: D;
  private readonly _options: Opt;

  constructor(discriminator: D, options: Opt) {
    this._discriminator = discriminator;
    this._options = options;
  }

  public options<NewOpt extends ReducerOpt2>(newOptions: NewOpt) {
    return new ProxyReducerOptionsBuilder<N, D, O, Opt & NewOpt>(this._discriminator, {...this._options, ...newOptions});
  }

  public spec<const S extends Spec2<N, D, O, Opt>>(spec: S) {
    const specArray = [spec] as const;
    return new ProxyReducerBuilder2<N, D, O, Opt, typeof specArray>(this._discriminator, specArray, this._options);
  }
}

export class ProxyReducerBuilder2<N extends object, const D extends keyof N, O, Opt extends ReducerOpt2, const S extends ReadonlyArray<Spec2<N, D, O, Opt>>> {

  private readonly _discriminator: D;
  private readonly _options: Opt;
  private readonly _specs: S;

  constructor(discriminator: D, specs: S, options: Opt) {
    this._discriminator = discriminator;
    this._specs = specs;
    this._options = options;
  }

  public options<NewOpt extends ReducerOpt2>(newOptions: NewOpt) {
    return new ProxyReducerBuilder2<N, D, O, Opt & NewOpt, S>(this._discriminator, this._specs, {...this._options, ...newOptions});
  }

  public any<BS extends SpecFn2<N, N, D, O, Opt, S>>(fn: BS) {

    const newSpecs = [...this._specs, {
      [ANY_KIND]: fn,
    }] as const;
    return new ProxyReducerBuilder2<N, D, O, Opt, typeof newSpecs>(this._discriminator, newSpecs, this._options);
  }

  public spec<const BS extends Spec2<N, D, O, Opt>>(spec: BS) {
    const newSpecs = [spec, ...this._specs] as const;
    return new ProxyReducerBuilder2<N, D, O, Opt, typeof newSpecs>(this._discriminator, newSpecs, this._options);
  }

  /**
   * Shorthand for creating a reducer without creating a new instance of a builder.
   */
  public reduce<const Input extends N, const NewOpt extends ReducerOpt2, const BS extends Spec2<N, D, O, Opt>>(input: Input, opt: NewOpt, spec: BS) {

    const defaultOptions = {
      immutable: false,
      once: false,
    } as const satisfies ReducerOpt2;

    const newOptions = {
      ...defaultOptions,
      ...this._options,
      ...opt,
    } as const satisfies ReducerOpt2;

    const stats = ProxyReducerBuilder2.getTrackingStatsSource(newOptions);
    const track = ProxyReducerBuilder2.getTrackingMode(newOptions);
    const finalSpecs = spec ? [spec, ...this._specs] as const : this._specs;

    const reducerOptions: Options2<N, D, O, typeof newOptions, typeof finalSpecs> & typeof newOptions = {
      ...newOptions,
      track: track,
      trackingStatsSource: stats,
      reducerId: ++stats.reducerIdCounter,
      specs: finalSpecs,
      discriminator: this._discriminator,
    } as const;

    return new ProxyReducer2<N, N, D, O, typeof newOptions, typeof finalSpecs>(reducerOptions).reduce(input);
  }

  /**
   * @param spec - Optionally give a spec directly instead of calling `spec(...).build()` and creating a new short-lived builder instance. If given function, it matches `ANY`
   */
  public build<const BS extends Spec2<N, D, O, Opt>>(spec?: BS) {

    const stats = ProxyReducerBuilder2.getTrackingStatsSource(this._options);
    const track = ProxyReducerBuilder2.getTrackingMode(this._options);
    const finalSpecs = spec ? [spec, ...this._specs] as const : this._specs;

    const reducerOptions: Options2<N, D, O, Opt, typeof finalSpecs> & Opt = {
      ...this._options,
      track: track,
      trackingStatsSource: stats,
      reducerId: ++stats.reducerIdCounter,
      specs: finalSpecs,
      discriminator: this._discriminator,
      immutable: this._options?.immutable ?? false,
      once: this._options?.once ?? false,
    };

    return new ProxyReducer2<N, N, D, O, Opt, typeof finalSpecs>(reducerOptions);
  }

  private static getTrackingStatsSource(options?: ReducerOpt2) {
    return options?.trackingStatsSource ?? GLOBAL_TRACKING_STATS;
  }

  private static getTrackingMode(options?: ReducerOpt2): ProxyReducerTrackMode2 {

    if (options?.track === true) {
      return ProxyReducerTrackMode2.LAST;
    } else if (options?.track === false) {
      return ProxyReducerTrackMode2.NONE;
    } else {
      if (options?.track === undefined) {
        return (options?.debug ?? (Environment.test && Environment.debug))
          ? ProxyReducerTrackMode2.LAST
          : ProxyReducerTrackMode2.NONE;
      } else {
        return options.track;
      }
    }
  }
}
