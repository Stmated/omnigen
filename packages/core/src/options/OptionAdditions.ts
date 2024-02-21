import {Options} from './Options';
import {Option} from './Option';

/**
 * What is this even?
 * TODO: Remove?
 *
 * @deprecated Use Zod instead
 */
export type OptionAdditions<TOpt extends Options> = {
  [Key in keyof TOpt]?: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? (value: TInc) => Partial<TOpt> | undefined
    : (value: TOpt[Key]) => Partial<TOpt> | undefined
};
