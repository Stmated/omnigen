import {Options} from './Options.js';
import {Option} from './Option.js';

export type IncomingOptions<TOpt extends Options> = {
  [Key in keyof TOpt]?: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? TInc | TReal
    : TOpt[Key];
};
