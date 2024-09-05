import {ProxyReducerTrackMode} from './ProxyReducerTrackMode.ts';
import {ProxyReducerTrackingSource} from './ProxyReducerTrackingSource.ts';

export interface ReducerOpt {
  track?: boolean | ProxyReducerTrackMode;
  debug?: boolean;
  immutable?: boolean;
  trackingStatsSource?: ProxyReducerTrackingSource;
}
