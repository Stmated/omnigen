import {Options} from './Options';
import {Option} from './Option';

/**
 * TODO: Remove! All places that use "Incoming" simply should not, or should only be aware of incoming Record<string, string>
 *
 * @deprecated Use Zod instead
 */
export type IncomingOptions<TOpt extends Options> = {
  [Key in keyof TOpt]?: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? TInc | TReal
    : TOpt[Key];
};
