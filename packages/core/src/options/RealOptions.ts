import {Options} from './Options';
import {Option} from './Option';

export type RealOptions<TOpt extends Options> = {
  [Key in keyof TOpt]: TOpt[Key] extends Option<infer _TInc, infer TReal>
    ? TReal
    : TOpt[Key];
};
