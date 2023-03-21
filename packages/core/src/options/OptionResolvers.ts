import {IncomingResolver} from './IncomingResolver';
import {Options} from './Options';
import {Option} from './Option';
import {OmitNever} from './OmitNever';

export type OptionResolvers<TOpt extends Options> = OmitNever<{
  [Key in keyof TOpt]: TOpt[Key] extends Option<infer TInc, infer TReal>
    ? TOpt[Key] extends TReal
      ? never
      : IncomingResolver<TInc, TReal>
    : never
}>;
