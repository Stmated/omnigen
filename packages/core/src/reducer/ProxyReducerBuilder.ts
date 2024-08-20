import {Environment} from '@omnigen/api';
import {ProxyReducerTrackMode} from './proxyReducerTrackMode.ts';

import {Spec} from './types.ts';
import {ProxyReducerTrackingSource} from './ProxyReducerTrackingSource.ts';
import {ReducerOpt} from './ReducerOpt.ts';
import {ProxyReducer} from './ProxyReducer.ts';

const GLOBAL_TRACKING_STATS: ProxyReducerTrackingSource = {
  idCounter: 0,
  reducerIdCounter: 0,
};

export type ProxyReducerDiscriminatorBuilder<N, O> = {
  discriminator: <const D extends keyof N>(d: D) => ProxyReducerOptionsBuilder<N, D, O, {}>;
}

export class ProxyReducerOptionsBuilder<N, const D extends keyof N, O, Opt extends ReducerOpt> {

  private readonly _discriminator: D;
  private readonly _options: Opt;

  constructor(discriminator: D, options: Opt) {
    this._discriminator = discriminator;
    this._options = options;
  }

  public options<NewOpt extends ReducerOpt>(newOptions: NewOpt) {
    return new ProxyReducerOptionsBuilder<N, D, O, Opt & NewOpt>(this._discriminator, {...this._options, ...newOptions});
  }

  public spec(spec: Spec<N, D, O, Opt>): ProxyReducerBuilder<N, D, O, Opt> {
    return new ProxyReducerBuilder(this._discriminator, [spec], this._options);
  }
}

export class ProxyReducerBuilder<N, const D extends keyof N, O, Opt extends ReducerOpt> {

  private readonly _discriminator: D;
  private readonly _options: Opt;
  private readonly _specs: ReadonlyArray<Spec<N, D, O, Opt>> = [];

  constructor(discriminator: D, specs: ReadonlyArray<Spec<N, D, O, Opt>>, options: Opt) {
    this._discriminator = discriminator;
    this._specs = specs;
    this._options = options;
  }

  public options<NewOpt extends ReducerOpt>(newOptions: NewOpt) {
    return new ProxyReducerBuilder<N, D, O, Opt & NewOpt>(this._discriminator, this._specs, {...this._options, ...newOptions});
  }

  public spec(spec: Spec<N, D, O, Opt>) {
    return new ProxyReducerBuilder<N, D, O, Opt>(this._discriminator, [spec, ...this._specs], this._options);
  }

  /**
   * @param spec - Optionally give a spec directly instead of calling `spec(...).build()` and creating a new short-lived builder instance.
   */
  public build(spec?: Spec<N, D, O, Opt>): ProxyReducer<N, D, O, Opt> {

    const stats = this._options?.trackingStatsSource ?? GLOBAL_TRACKING_STATS;
    let track: ProxyReducerTrackMode;
    if (this._options?.track === true) {
      track = ProxyReducerTrackMode.LAST;
    } else if (this._options?.track === false) {
      track = ProxyReducerTrackMode.NONE;
    } else {
      if (this._options?.track === undefined) {
        track = (this._options?.debug ?? (Environment.test && Environment.debug))
          ? ProxyReducerTrackMode.LAST
          : ProxyReducerTrackMode.NONE;
      } else {
        track = this._options.track;
      }
    }

    return new ProxyReducer<N, D, O, Opt>({
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
