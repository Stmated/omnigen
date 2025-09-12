import {OMNI_GENERIC_FEATURES, TargetFeatures} from '@omnigen/api';

export const TYPESCRIPT_FEATURES: TargetFeatures = {
  ...OMNI_GENERIC_FEATURES,
  literalTypes: true,
  primitiveGenerics: true,
  primitiveInheritance: false,
  nestedDeclarations: false,
  relativeImports: true,
  forcedImports: true,
  transparentAccessors: true,
  interfaceWithFields: true,
};
