import {OMNI_GENERIC_FEATURES, StaticInnerTypeKind, TargetFeatures} from '@omnigen/api';

export const CSHARP_FEATURES: TargetFeatures = {
  ...OMNI_GENERIC_FEATURES,
  literalTypes: false,
  primitiveGenerics: true,
  primitiveInheritance: false,
  nestedDeclarations: true,
  relativeImports: true,
  forcedImports: false,
  staticInnerTypes: StaticInnerTypeKind.DEFAULT_STATIC,
  unions: false,
};
