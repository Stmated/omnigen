import {ProxyReducerTrackMode} from './ProxyReducerTrackMode';
import {ProxyReducerTrackingSource} from './ProxyReducerTrackingSource';

export interface ReducerOpt {
  track?: boolean | ProxyReducerTrackMode;
  debug?: boolean;
  immutable?: boolean;
  trackingStatsSource?: ProxyReducerTrackingSource;
}
