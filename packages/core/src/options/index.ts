import {z} from 'zod';
import {AstNode} from '../ast';

export * from './Booleanish';
export * from './Options';
export * from './OptionsParser';
export * from './IPackageResolver';
export * from './PackageOptions';
export * from './Option';
export * from './IncomingOptions';
export * from './OptionsSource';
export * from './OptionResolvers';
export * from './IncomingResolver';
export * from './OptionAdditions';
export * from './OmitNever';

const ZodAstNode = z.custom<AstNode>(d => d != undefined && typeof d == 'object' && 'visit' in d);

export const ZodAstNodeContext = z.object({
  astNode: ZodAstNode,
});

export const ZodAstNodesContext = z.object({
  astNodes: z.array(ZodAstNode),
});
export {PackageResolverOptionsResolver} from './PackageResolverOptionsResolver.ts';
