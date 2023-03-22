import {Booleanish, Option, Options} from '../options';
import {CompressTypeLevel, OmniTypeKind} from '../parse';
import {OmniTypeNameReducer} from './OmniTypeNameReducer';
import {CompressTypeNaming} from './CompressTypeNaming';

export interface TargetOptions extends Options {

  /**
   * Means to compress types by making them an inner type, if it is only ever used by one other type.
   * This creates less files, and can be easier to read, since the solo-referenced type is probably
   * strongly linked to the target type... such as an Enum, or an extra-attribute type of a data object.
   */
  compressSoloReferencedTypes: Option<Booleanish, boolean>;

  /**
   * Means to compress types that inherit from another type, but is never used anywhere.
   * This can for example be error response types, with different error codes.
   * It can clutter to have each error response type be in its own compilation unit, so we can compress them.
   */
  compressUnreferencedSubTypes: Option<Booleanish, boolean>;

  /**
   * The kinds of types that are allowed to be compressed.
   * An empty array means that all types are allowed.
   */
  compressTypeKinds: OmniTypeKind[];

  compressTypesLevel: CompressTypeLevel;
  compressTypeNaming: CompressTypeNaming;
  allowCompressInterfaceToInner: Option<Booleanish, boolean>,
  compressTypeNamingReducer: Option<undefined, OmniTypeNameReducer | undefined>;

  additionalPropertiesInterfaceAfterDuplicateCount: number;


  // TODO: Introduce naming options for things like banning certain words? Like "Object" or "List" or something?
  //        So that no weird and stupid names become chosen if we are grabbing the common prefix?
  //        For example ALL names that exist inside java.lang or java.util should be excluded. Object, List, etc.
  //        Maybe also add a "minimum number of common words"?
}

export const DEFAULT_TARGET_OPTIONS: TargetOptions = {
  compressSoloReferencedTypes: true,
  compressUnreferencedSubTypes: true,
  compressTypeKinds: [],
  compressTypesLevel: CompressTypeLevel.EXACT,
  compressTypeNaming: CompressTypeNaming.EXACT,
  compressTypeNamingReducer: undefined,
  additionalPropertiesInterfaceAfterDuplicateCount: 2,
  allowCompressInterfaceToInner: true,
};
