import {IOptions, PrimitiveGenerificationChoice} from '@options';
import {CompressTypeLevel, OmniTypeKind} from '@parse';

export interface ITargetOptions extends IOptions {

  /**
   * Means to compress types by making them an inner type, if it is only ever used by one other type.
   * This creates less files, and can be easier to read, since the solo-referenced type is probably
   * strongly linked to the target type... such as an Enum, or an extra-attribute type of a data object.
   */
  compressSoloReferencedTypes: boolean;

  /**
   * Means to compress types that inherit from another type, but is never used anywhere.
   * This can for example be error response types, with different error codes.
   * It can clutter to have each error response type be in its own compilation unit, so we can compress them.
   */
  compressUnreferencedSubTypes: boolean;

  /**
   * The kinds of types that are allowed to be compressed.
   * An empty array means that all types are allowed.
   */
  compressTypeKinds: OmniTypeKind[];

  compressTypesLevel: CompressTypeLevel,

  compressPropertiesToAncestor: boolean;
}

export interface IGenericTargetOptions extends ITargetOptions {
  onPrimitiveGenerification: PrimitiveGenerificationChoice;
}

export const DEFAULT_TARGET_OPTIONS: ITargetOptions = {
  compressSoloReferencedTypes: true,
  compressUnreferencedSubTypes: true,
  compressTypeKinds: [],
  compressTypesLevel: CompressTypeLevel.EXACT,
  compressPropertiesToAncestor: true
};
