import {getEnumValues, ZodCoercedBoolean, ZodCoercedNumber, ZodOptions} from '../options';
import {CompressTypeLevel, OmniTypeKind} from '../parse';
import {ZodOmniTypeNameReducer} from './OmniTypeNameReducer.ts';
import {CompressTypeNaming} from './CompressTypeNaming.ts';
import {z} from 'zod';

// TODO: Introduce naming options for things like banning certain words? Like "Object" or "List" or something?
//        So that no weird and stupid names become chosen if we are grabbing the common prefix?
//        For example ALL names that exist inside java.lang or java.util should be excluded. Object, List, etc.
//        Maybe also add a "minimum number of common words"?

export const ZodTargetOptions = ZodOptions.extend({

  /**
   * Means to compress types by making them an inner type, if it is only ever used by one other type.
   * This creates less files, and can be easier to read, since the solo-referenced type is probably
   * strongly linked to the target type... such as an Enum, or an extra-attribute type of a data object.
   */
  compressSoloReferencedTypes: ZodCoercedBoolean.default('true'),

  /**
   * Means to compress types that inherit from another type, but is never used anywhere.
   * This can for example be error response types, with different error codes.
   * It can clutter to have each error response type be in its own compilation unit, so we can compress them.
   */
  compressUnreferencedSubTypes: ZodCoercedBoolean.default('true'),

  /**
   * The kinds of types that are allowed to be compressed.
   * An empty array means that all types are allowed.
   */
  compressTypeKinds: z.array(z.enum(getEnumValues(OmniTypeKind))).default([]),

  compressTypesLevel: z.enum(getEnumValues(CompressTypeLevel)).default(CompressTypeLevel.EXACT),
  compressTypeNaming: z.enum(getEnumValues(CompressTypeNaming)).default(CompressTypeNaming.EXACT),
  compressTypeNamingReducer: z.union([ZodOmniTypeNameReducer, z.undefined()]).nullable(),

  /**
   * If there are multiple classes which uses a duplicate "additional properties" field,
   * then after X number of duplicates, we introduce an interface which those classes implement.
   *
   * This might simplify things like generically iterating through different classes without having to cast to each specific type.
   */
  additionalPropertiesInterfaceAfterDuplicateCount: ZodCoercedNumber.default(2),
  allowCompressInterfaceToInner: ZodCoercedBoolean.default('true'),

  shortenNestedTypeNames: ZodCoercedBoolean.default('true'),

  debug: ZodCoercedBoolean.default('false'),
  // debugPlugin: z.string().optional(),
});

export type IncomingTargetOptions = z.input<typeof ZodTargetOptions>;
export type TargetOptions = z.infer<typeof ZodTargetOptions>;

export const DEFAULT_TARGET_OPTIONS = ZodTargetOptions.parse({});
