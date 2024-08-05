import {OMNI_GENERIC_FEATURES, StaticInnerTypeKind, TargetFeatures} from '@omnigen/api';

export * from './visit';
export * from './transform';
export * from './options';
export * from './util';
export * from './render';
export * from './parse';
export * from './reduce';
export * as JavaPlugins from './JavaPluginInit.ts';

export * from './ast/JavaAstRootNode.ts';

export * as Java from './ast/JavaAst';

export * from './ast/JavaObjectNameResolver';

export const JAVA_FEATURES: TargetFeatures = {
  ...OMNI_GENERIC_FEATURES,
  literalTypes: false,
  primitiveGenerics: false,
  primitiveInheritance: false,
  nestedDeclarations: true,
  relativeImports: false,
  forcedImports: false,
  staticInnerTypes: StaticInnerTypeKind.DEFAULT_PARENT_ACCESSIBLE,
  unions: false,
};

