import {Environment} from '@omnigen/api';
import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2';
import {Spec2} from './types';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2';
import {ReducerOpt2} from './ReducerOpt2';
import {ProxyReducer2} from './ProxyReducer2';

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

  public spec(spec: Spec2<N, D, O, Opt>): ProxyReducerBuilder2<N, D, O, Opt> {
    return new ProxyReducerBuilder2(this._discriminator, [spec], this._options);
  }
}

export class ProxyReducerBuilder2<N extends object, const D extends keyof N, O, Opt extends ReducerOpt2> {

  private readonly _discriminator: D;
  private readonly _options: Opt;
  private readonly _specs: ReadonlyArray<Spec2<N, D, O, Opt>> = [];

  constructor(discriminator: D, specs: ReadonlyArray<Spec2<N, D, O, Opt>>, options: Opt) {
    this._discriminator = discriminator;
    this._specs = specs;
    this._options = options;
  }

  public options<NewOpt extends ReducerOpt2>(newOptions: NewOpt) {
    return new ProxyReducerBuilder2<N, D, O, Opt & NewOpt>(this._discriminator, this._specs, {...this._options, ...newOptions});
  }

  public spec(spec: Spec2<N, D, O, Opt>) {
    return new ProxyReducerBuilder2<N, D, O, Opt>(this._discriminator, [spec, ...this._specs], this._options);
  }

  /**
   * @param spec - Optionally give a spec directly instead of calling `spec(...).build()` and creating a new short-lived builder instance.
   */
  public build(spec?: Spec2<N, D, O, Opt>): ProxyReducer2<N, N, D, O, Opt> {

    const stats = this._options?.trackingStatsSource ?? GLOBAL_TRACKING_STATS;
    let track: ProxyReducerTrackMode2;
    if (this._options?.track === true) {
      track = ProxyReducerTrackMode2.LAST;
    } else if (this._options?.track === false) {
      track = ProxyReducerTrackMode2.NONE;
    } else {
      if (this._options?.track === undefined) {
        track = (this._options?.debug ?? (Environment.test && Environment.debug))
          ? ProxyReducerTrackMode2.LAST
          : ProxyReducerTrackMode2.NONE;
      } else {
        track = this._options.track;
      }
    }

    return new ProxyReducer2<N, N, D, O, Opt>({
      ...this._options,
      track: track,
      trackingStatsSource: stats,
      reducerId: ++stats.reducerIdCounter,
      specs: spec ? [spec, ...this._specs] : this._specs,
      discriminator: this._discriminator,
      immutable: this._options?.immutable ?? false,
    });
  }
}
