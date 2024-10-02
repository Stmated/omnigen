import {z} from 'zod';
import {AstNode} from '../ast';

export * from './Options';
export * from './IPackageResolver';
export * from './PackageOptions';
export * from './OptionsSource';

const ZodAstNode = z.custom<AstNode>(d => d != undefined && typeof d === 'object' && ('visit' satisfies keyof AstNode) in d);

export const ZodAstNodeContext = z.object({
  astNode: ZodAstNode,
});

export const ZodAstNodesContext = z.object({
  astNodes: z.array(ZodAstNode),
});
export {PackageResolverOptionsResolver} from './PackageResolverOptionsResolver';
