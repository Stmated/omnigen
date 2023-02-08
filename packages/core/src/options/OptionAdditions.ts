import {Options} from './Options';
import {Option} from './Option';
import {RealOptions} from './RealOptions';

export type OptionAdditions<TOpt extends Options> = {
  [Key in keyof TOpt]?: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? (value: TInc) => Partial<RealOptions<TOpt>> | undefined
    : (value: TOpt[Key]) => Partial<RealOptions<TOpt>> | undefined
};
