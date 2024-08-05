import {
  createPlugin,
  ZodArgumentsContext,
  ZodModelTransformOptionsContext,
  ZodPackageOptionsContext,
  ZodParserOptionsContext,
  ZodTargetOptionsContext,
} from '@omnigen/core-plugin';
import {ZodModelTransformOptions, ZodPackageOptions, ZodParserOptions, ZodTargetOptions} from '@omnigen/api';

// TODO: Might need to be split up to make use of arguments from the schema file or whatnot.
//        To make this more valid there might be a need for a "higher/lower score if earlier/later" multiplier
// export const StdOptionsPlugin = createPlugin(
//   {name: 'opt', in: ZodArgumentsContext, out: ZodStdOptionsContext},
//   async ctx => {
//
//
//   },
// );

