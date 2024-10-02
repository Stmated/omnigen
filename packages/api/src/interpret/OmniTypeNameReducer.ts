import {CompressTypeNaming} from './CompressTypeNaming';
import {z} from 'zod';

export const ZodOmniTypeNameReducer = z.function()
  .args(z.array(z.array(z.string())))
  .returns(
    z.union([
      z.string(),
      z.nativeEnum(CompressTypeNaming),
      z.undefined(),
    ]),
  );

export type OmniTypeNameReducer = z.infer<typeof ZodOmniTypeNameReducer>;
