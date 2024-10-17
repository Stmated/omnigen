import {ProxyReducerTrackMode2} from './ProxyReducerTrackMode2';
import {ProxyReducerTrackingSource2} from './ProxyReducerTrackingSource2';

export interface ReducerOpt2 {
  track?: boolean | ProxyReducerTrackMode2;
  debug?: boolean;
  immutable?: boolean;
  /**
   * Set to true to only visit a node once, automatically persisting the result of a reduction without needing to call `.persist()`
   */
  once?: boolean;
  trackingStatsSource?: ProxyReducerTrackingSource2;
}
