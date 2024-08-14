import {TargetOptions} from '@omnigen/api';

export * from './TestUtils.js';

export const DEFAULT_SPECIFIC_TEST_TARGET_OPTIONS: Partial<TargetOptions> = {
  compressSoloReferencedTypes: false,
  compressUnreferencedSubTypes: false,
  orderMembersByName: true,
  orderObjectsByDependency: false,
};
