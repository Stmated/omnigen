import {Options} from './Options.js';
import {Option} from './Option.js';

export type RealOptions<TOpt extends Options> = {
  [Key in keyof TOpt]-?: TOpt[Key] extends Option<infer TInc, infer TReal>
      ? TReal
      : TOpt[Key];
};
