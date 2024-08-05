import {z} from 'zod';
import {AstNode} from '../ast';

export * from './Options.ts';
export * from './IPackageResolver.ts';
export * from './PackageOptions.ts';
export * from './Option.ts';
export * from './OptionsSource.ts';

const ZodAstNode = z.custom<AstNode>(d => d != undefined && typeof d == 'object' && 'visit' in d);

export const ZodAstNodeContext = z.object({
  astNode: ZodAstNode,
});

export const ZodAstNodesContext = z.object({
  astNodes: z.array(ZodAstNode),
});
export {PackageResolverOptionsResolver} from './PackageResolverOptionsResolver.ts';
