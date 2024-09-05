import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2.ts';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2.ts';

export interface ReducerOpt2 {
  track?: boolean | ProxyReducerTrackMode2;
  debug?: boolean;
  immutable?: boolean;
  trackingStatsSource?: ProxyReducerTrackingSource2;
}
