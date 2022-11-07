import {Options} from './Options';
import {Option} from './Option';

export type IncomingOptions<TOpt extends Options> = {
  [Key in keyof TOpt]?: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? TInc | TReal
    : TOpt[Key];
};
