import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2';

export interface ReducerOpt2 {
  track?: boolean | ProxyReducerTrackMode2;
  debug?: boolean;
  immutable?: boolean;
  trackingStatsSource?: ProxyReducerTrackingSource2;
}
