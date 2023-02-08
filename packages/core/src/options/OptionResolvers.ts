import {IncomingResolver} from './IncomingResolver';
import {Options} from './Options';
import {Option} from './Option';

type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type OptionResolvers<TOpt extends Options> = OmitNever<{
  [Key in keyof TOpt]: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? TOpt[Key] extends TReal
      ? never
      : IncomingResolver<TInc, TReal>
    : never
}>;
