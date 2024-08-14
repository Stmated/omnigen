import {TypeName} from './TypeName';
import {OmniKindComposition, OmniKindPrimitive, OmniTypeKind} from './OmniTypeKind.ts';
import {ObjectName} from '../ast';
import {OmniItemKind} from './OmniItemKind.ts';
import {Direction} from './ParserOptions.ts';

export interface OmniParameter {
  name: string;
  description?: string;
  summary?: string;
  type: OmniType;
  required: boolean;
  deprecated: boolean;
}

export interface OmniAnnotation {
  name: string;
  parameters: OmniParameter[];
}

/**
 * Important that these levels are in the order of least visible to most visible.
 */
export enum OmniAccessLevel {
  PRIVATE,
  PACKAGE,
  PUBLIC,
}

export enum OmniArrayKind {
  PRIMITIVE,
  LIST,
  SET,
}

export interface OmniAdditionalPropertyName {
  /**
   * The preferred name of the field when it is placed in an object.
   */
  fieldName?: string | undefined;
  /**
   * The preferred name of the property when it is placed in an object (basis for getter and setter method names)
   */
  propertyName?: string | undefined;
}

export interface OmniSerializationPropertyName {
  /**
   * The name of the property when it will be serialized/deserialized.
   */
  name: string;
  isPattern?: false;
}

export type OmniPropertyNames = (OmniSerializationPropertyName & OmniAdditionalPropertyName);

export interface OmniPropertyNamePattern {
  name: RegExp;
  isPattern: true;
}

export type OmniPropertyName = string | OmniPropertyNames | OmniPropertyNamePattern;

export interface OmniProperty extends OmniItemBase<typeof OmniItemKind.PROPERTY> {

  name: OmniPropertyName;

  type: OmniType;
  /**
   * TODO: REMOVE! It is ugly and should not really be needed...
   * @deprecated Find some other way of handling this per-context, like keeping an informational stack
   */
  owner: OmniPropertyOwner;

  description?: string | undefined;
  summary?: string | undefined;
  deprecated?: boolean;

  debug?: string | string[] | undefined;

  /**
   * TODO: This and the other booleans below should rather be part of the type, since it can have significance depending on target language
   */
  required?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;

  /**
   * If `true`, then the property exists as meta-information but should/might not be displayed in the generated code.
   *
   * An example is if we have `A: {prop: 'foo'}` and `B: {prop: 'bar'}` with supertype `C: {}`, and we want to elevate `prop` to `C` as `string`,
   * then hide `A#prop` and `B#prop`; but need to keep the literal values `foo` and `bar` for later transformers.
   */
  hidden?: boolean;
  abstract?: boolean;

  accessLevel?: OmniAccessLevel;

  annotations?: OmniAnnotation[];
}

export type OmniPropertyOrphan = Omit<OmniProperty, 'owner'> & Partial<Pick<OmniProperty, 'owner'>>;

// TODO: Create an "OR" type and use that instead of types that lose information by going to a common denominator?

export type OmniArrayTypes = OmniArrayType | OmniArrayPropertiesByPositionType | OmniTupleType;

export type OmniGenericIdentifierType = OmniGenericSourceIdentifierType | OmniGenericTargetIdentifierType;
export type OmniGenericType = OmniGenericIdentifierType | OmniGenericSourceType | OmniGenericTargetType;
export type OmniSubTypeCapableType =
  OmniObjectType
  | OmniEnumType
  | OmniInterfaceType
  | OmniExternalModelReferenceType<OmniSubTypeCapableType>
  | OmniDecoratingType<OmniSubTypeCapableType>
  | OmniIntersectionType<OmniSubTypeCapableType>
  | OmniUnionType<OmniSubTypeCapableType>
  | OmniExclusiveUnionType<OmniSubTypeCapableType>
  | OmniNegationType<OmniSubTypeCapableType>
  ;

/**
 * TODO: Not a good name. Need to make it clearer that an Object can be an Interface in a target language
 *        And that this type represents both possibilities.
 */
export type OmniInterfaceOrObjectType = OmniInterfaceType | OmniObjectType | OmniDecoratingType<OmniInterfaceOrObjectType>;

// TODO: This need to be moved to be more language-specific, since it is not true for many languages
export type OmniSuperTypeCapableType =
  OmniObjectType
  | OmniInterfaceType
  | OmniGenericTargetType
  | OmniEnumType
  | OmniHardcodedReferenceType
  | OmniIntersectionType<OmniSuperTypeCapableType>
  | OmniUnionType<OmniSuperTypeCapableType>
  | OmniExclusiveUnionType<OmniSuperTypeCapableType>
  | OmniNegationType<OmniSuperTypeCapableType>
  | OmniExternalModelReferenceType<OmniSuperTypeCapableType> // Needs to be unwrapped/resolved every time
  | OmniDecoratingType<OmniSuperTypeCapableType>
  | OmniPrimitiveType
  ;

export type OmniSuperGenericTypeCapableType =
  OmniObjectType
  | OmniInterfaceType
  | OmniDecoratingType<OmniSuperTypeCapableType>
  | OmniExternalModelReferenceType<OmniSuperGenericTypeCapableType> // Needs to be unwrapped/resolved every time
  | OmniHardcodedReferenceType
  ;

export type OmniTypeComposition =
  OmniIntersectionType
  | OmniUnionType
  | OmniExclusiveUnionType
  | OmniNegationType
  ;

export type OmniPrimitiveNumericType =
  OmniPrimitiveBaseType<typeof OmniTypeKind.INTEGER_SMALL>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.INTEGER>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.LONG>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.DOUBLE>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.FLOAT>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.DECIMAL>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.NUMBER>
  ;

export type OmniPrimitiveType =
  OmniPrimitiveNumericType
  | OmniPrimitiveBaseType<typeof OmniTypeKind.STRING>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.CHAR>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.BOOL>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.VOID>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.NULL>
  | OmniPrimitiveBaseType<typeof OmniTypeKind.UNDEFINED>
  ;

export type OmniType =
  | OmniArrayTypes
  | OmniObjectType
  | OmniUnknownType
  | OmniDictionaryType
  | OmniHardcodedReferenceType
  | OmniExternalModelReferenceType
  | OmniPrimitiveType
  | OmniTypeComposition
  | OmniEnumType
  | OmniGenericType
  | OmniInterfaceType
  | OmniDecoratingType
  ;

export type UnwrappableTypes<Inner extends OmniType> = (OmniExternalModelReferenceType<Inner> | OmniDecoratingType<Inner>) & OmniTypeWithInnerType<Inner>;

export type SmartUnwrappedType<T extends OmniType | undefined> =
  T extends undefined
    ? undefined
    : T extends UnwrappableTypes<infer R>
      ? Exclude<R, UnwrappableTypes<any>>
      : T;

export interface OmniOptionallyNamedType {

  /**
   * The name of the type.
   * The name is not necessarily unique. There might be many types with the same name, until late-stage name-resolution before rendering.
   */
  name?: TypeName | undefined;
}

export interface OmniNamedType extends OmniOptionallyNamedType {

  /**
   * The name of the type.
   * The name is not necessarily unique. There might be many types with the same name, until late-stage name-resolution before rendering.
   */
  name: TypeName;
}

export interface OmniTypeWithInnerType<T extends OmniType | OmniType[] = OmniType> {
  of: T;
}

export interface OmniExample<T> extends OmniItemBase<typeof OmniItemKind.EXAMPLE> {
  value: T;
  description?: string | undefined;
}

export interface OmniBaseType<T extends OmniTypeKind> {

  kind: T;
  /**
   * True if the type was implicitly deduced but not specifically spelled out.
   * For example if a type contains no specification of what type it is, but has a default value of "0".
   * We can then deduce that it is a number, but it was never said as such. Can be used to downgrade this type's importance if we ever need to simplify (for example) compositions.
   */
  implicit?: boolean;
  /**
   * True if the type SHOULD be preferred to be inlined.
   */
  inline?: boolean;

  /**
   * Depending on target language, nullability of a type means different things. In Java any reference can be null, in TypeScript it needs to be explicitly allowed to be null.
   */
  nullable?: boolean;
  /**
   * TODO: Implement! REMOVE the optional and make it required! ALL types MUST have an absolute uri, to make it possible to merge types between schemas/contracts
   */
  absoluteUri?: string | undefined;
  accessLevel?: OmniAccessLevel | undefined;
  title?: string | undefined;
  description?: string | undefined;

  /**
   * Rename to `remarks` to separate it more clearly from 'description'. Or remove in favor of making `description` an array where order is importance.
   */
  summary?: string | undefined;

  debug?: string | string[] | undefined;

  examples?: OmniExample<unknown>[] | undefined;
}

export type OmniTypeOf<T extends OmniType, K extends OmniTypeKind> = Extract<T, { kind: K }>;

// TODO: Likely `NULL` should not be a primitive, and instead be its own separate type, since most properties are not relevant to `NULL`
export type OmniPrimitiveNull = OmniTypeOf<OmniType, typeof OmniKindPrimitive.NULL>;

export interface OmniCompositionTypeBase<T extends OmniType, K extends OmniKindComposition> extends OmniBaseType<K>, OmniOptionallyNamedType {
  types: T[];
}

export interface OmniIntersectionType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, typeof OmniTypeKind.INTERSECTION> {
}

export interface OmniUnionType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, typeof OmniTypeKind.UNION> {
}

export interface OmniExclusiveUnionType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, typeof OmniTypeKind.EXCLUSIVE_UNION> {
}

export interface OmniNegationType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, typeof OmniTypeKind.NEGATION> {
}

export type OmniCompositionType<T extends OmniType = OmniType, CK extends OmniKindComposition = OmniKindComposition> = Extract<
  OmniIntersectionType<T>
  | OmniUnionType<T>
  | OmniExclusiveUnionType<T>
  | OmniNegationType<T>
  , { kind: CK }>
  ;


export interface OmniDictionaryType<K extends OmniType = OmniType, V extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.DICTIONARY> {
  keyType: K;
  valueType: V;
}

export interface OmniHardcodedReferenceType extends OmniBaseType<typeof OmniTypeKind.HARDCODED_REFERENCE> {
  fqn: ObjectName;
}

export interface OmniExternalModelReferenceType<TType extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.EXTERNAL_MODEL_REFERENCE>, OmniNamedType, OmniTypeWithInnerType<TType> {
  model: OmniModel;
  name: TypeName;
}

interface OmniArrayBase {
  arrayKind?: OmniArrayKind | undefined;
}

export interface OmniArrayType<Item extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.ARRAY>, OmniTypeWithInnerType<Item>, OmniArrayBase, OmniOptionallyNamedType {
  minLength?: number | undefined;
  maxLength?: number | undefined;
  possiblySingle?: boolean;
}

export type OmniPropertyOwner = OmniObjectType | OmniArrayPropertiesByPositionType;

/**
 * Similar to GenericArrayType, but this solves issue of having a list of types in a static order.
 * It DOES NOT mean "any of these types" or "one of these types", it means "THESE TYPES IN THIS ORDER IN THIS ARRAY"
 */
export interface OmniArrayPropertiesByPositionType extends OmniBaseType<typeof OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION>, OmniArrayBase {
  properties: OmniProperty[];
  commonDenominator?: OmniType | undefined;
}

export interface OmniTupleType extends OmniBaseType<typeof OmniTypeKind.TUPLE>, OmniArrayBase {
  types: OmniType[];
  commonDenominator?: OmniType | undefined;
}


export interface OmniInterfaceType<T extends OmniSuperTypeCapableType = OmniSuperTypeCapableType>
  extends OmniBaseType<typeof OmniTypeKind.INTERFACE>, OmniOptionallyNamedType, OmniTypeWithInnerType<T> {

  /**
   * This is a replacement of any potential 'extendedBy' inside the original type inside 'of'.
   * That is because all the subtypes of the interface must also be converted into an interface.
   * We cannot change the 'extendedBy' of the original type.
   */
  extendedBy?: OmniSuperTypeCapableType | undefined;
}

/**
 * A type for decorating an already existing type.
 *
 * For example if all we want is to update the description of the type for a property but do not want to change the actual type.
 */
export interface OmniDecoratingType<T extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.DECORATING>, OmniOptionallyNamedType, OmniTypeWithInnerType<T> {

}

export const UnknownKind = {

  /**
   * Java: `JsonNode` (if Jackson), TypeScript: `unknown`, C#: `dynamic`
   */
  DYNAMIC: 'DYNAMIC',

  /**
   * Java: `Object`, TypeScript: `unknown`, C#: `dynamic`
   */
  DYNAMIC_NATIVE: 'DYNAMIC_NATIVE',

  /**
   * Java: `JsonObject` (if Jackson), TypeScript: `object`, C#: `dynamic`
   */
  DYNAMIC_OBJECT: 'DYNAMIC_OBJECT',

  /**
   * Java: `Object`, TypeScript: `object`, C#: `object`
   */
  OBJECT: 'OBJECT',

  /**
   * Java: `?`, TypeScript: `unknown`, C#: `dynamic`
   */
  WILDCARD: 'WILDCARD',

  /**
   * Java: `Object`, TypeScript: `any`, C#: `Object`
   */
  ANY: 'ANY',
} as const;
export type UnknownKind = (typeof UnknownKind)[keyof typeof UnknownKind];

/**
 * Avoid using this, but can be helpful if has no access to any context/options.
 */
export const DEFAULT_UNKNOWN_KIND = UnknownKind.ANY;

export interface OmniUnknownType extends OmniBaseType<typeof OmniTypeKind.UNKNOWN> {
  valueDefault?: OmniPrimitiveConstantValue | null;
  unknownKind?: UnknownKind;
  upperBound?: OmniType;
}

export interface OmniSubTypeHint extends OmniItemBase<typeof OmniItemKind.SUBTYPE_HINT> {

  type: OmniType;
  qualifiers: OmniPayloadPathQualifier[];
}

export interface OmniObjectType<E extends OmniSuperTypeCapableType = OmniSuperTypeCapableType> extends OmniBaseType<typeof OmniTypeKind.OBJECT>, OmniNamedType {

  /**
   * An object can only be extended by "one" thing.
   * But this one thing can be something concrete, something generic, or a composition.
   * It is up to the target language what to do with it/how to transform it to something useful.
   */
  extendedBy?: E | undefined;

  /**
   * The composition types that inherit this interface can help with the mapping of the runtime types.
   * If there is a runtime mapping, then we do not need to do it manually in the target language's code.
   * This is predicated on the language having some other method of doing it, though. Like Java `@JsonTypeInfo` and `@JsonSubTypes`
   */
  subTypeHints?: OmniSubTypeHint[] | undefined;

  /**
   * NOTE: Important to note that a property can exist in multiple places in the type hierarchy. It is up to target-specific transformers to handle those situations.
   */
  properties: OmniProperty[];

  abstract?: boolean | undefined;

  /**
   * The direction that this object is used in. If the direction is `OUT` (we send it to a server) then we can use more constant values from the contracts.
   * In difference to `IN` where we still need to take and use what is given to us from the other end.
   */
  direction?: Direction;
}

export type OmniPrimitiveConstantValue = string | boolean | number | object | null;

export interface OmniPrimitiveBaseType<K extends OmniPrimitiveKinds = OmniPrimitiveKinds> extends OmniBaseType<K>, OmniOptionallyNamedType {

  name?: TypeName;

  /**
   * Means "default" if `literal` is false, means "constant value" if `literal` is true.
   *
   * TODO: Should perhaps be an OmniPrimitiveType instead, with `literal: true` -- so we can have more lossless handling of the value (like comments for the "default" value)
   * TODO: Perhaps also remove the `literal` boolean and instead have two different `defaultValue` and `constValue` properties here instead, to separate them and make them clearer
   */
  value?: OmniPrimitiveConstantValue | OmniPrimitiveConstantValue[] | undefined;
  /**
   * aka `const` -- cannot be set, it is a static, literal value that can be inlined without any issues.
   */
  literal?: boolean;
}

export type AllowedEnumTsTypes = number | string;

export type OmniPrimitiveKinds = OmniPrimitiveType['kind'];
export type OmniPrimitiveTangibleKind = Exclude<OmniPrimitiveKinds, typeof OmniTypeKind.NULL | typeof OmniTypeKind.VOID>;

export interface OmniItemBase<K extends OmniItemKind> {
  kind: K;
}

export interface OmniEnumMember extends OmniItemBase<typeof OmniItemKind.ENUM_MEMBER> {
  value: AllowedEnumTsTypes;
  name?: string;
  description?: string;
}

export type OmniItem =
  OmniModel
  | OmniEnumMember
  | OmniProperty
  | OmniExample<unknown>
  | OmniLicense
  | OmniContact
  | OmniLink
  | OmniLinkMapping
  | OmniLinkSourceParameter
  | OmniLinkTargetParameter
  | OmniEndpoint
  | OmniExternalDocumentation
  | OmniServer
  | OmniCallback
  | OmniExamplePairing
  | OmniExampleParam
  | OmniExampleResult
  | OmniTransport
  | OmniPayloadPathQualifier
  | OmniOutput
  | OmniInput
  | OmniSubTypeHint
  ;

export type OmniNode = OmniType | OmniItem;

export interface OmniEnumType extends OmniBaseType<typeof OmniTypeKind.ENUM>, OmniNamedType {
  members: OmniEnumMember[];
  itemKind: OmniPrimitiveKinds;
  extendedBy?: OmniSuperTypeCapableType;
}

// TODO: Should this actually be a type, and not just something simpler? Since it can ONLY exist inside a OmniGenericSourceType...
export interface OmniGenericSourceIdentifierType<
  Lower extends OmniType = OmniType,
  Upper extends OmniType = OmniType,
  Edges extends OmniType[] = OmniType[]
> extends OmniBaseType<typeof OmniTypeKind.GENERIC_SOURCE_IDENTIFIER> {

  placeholderName: string;
  lowerBound?: Lower | undefined;
  upperBound?: Upper | undefined;

  /**
   * List of distinct known types used as bounds for the generic source.
   * This can be used to quickly know in some places what the implementations of a certain generic identifier is.
   */
  knownEdgeTypes?: Edges | undefined;
}

export interface OmniGenericTargetIdentifierType<T extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.GENERIC_TARGET_IDENTIFIER> {

  /**
   * If no placeholder name is set, then it has the same placeholder name as the sourceIdentifier.
   */
  placeholderName?: string;
  sourceIdentifier: OmniGenericSourceIdentifierType;
  type: T;
}

export interface OmniGenericSourceType<T extends OmniSuperGenericTypeCapableType = OmniSuperGenericTypeCapableType> extends OmniBaseType<typeof OmniTypeKind.GENERIC_SOURCE>, OmniTypeWithInnerType<T> {
  sourceIdentifiers: OmniGenericSourceIdentifierType[];
}

export interface OmniGenericTargetType<T extends OmniSuperGenericTypeCapableType = OmniSuperGenericTypeCapableType> extends OmniBaseType<typeof OmniTypeKind.GENERIC_TARGET> {
  source: OmniGenericSourceType<T>;
  targetIdentifiers: OmniGenericTargetIdentifierType[];
}

export interface OmniInput extends OmniItemBase<typeof OmniItemKind.INPUT> {
  description?: string;
  contentType: string;

  type: OmniType;
}

export interface OmniOutput extends OmniItemBase<typeof OmniItemKind.OUTPUT> {
  name: string;
  description?: string | undefined;
  summary?: string | undefined;
  contentType: string;
  type: OmniType;
  required: boolean;
  deprecated: boolean;
  error: boolean;

  qualifiers: OmniPayloadPathQualifier[];
}

export interface OmniExampleParam extends OmniItemBase<typeof OmniItemKind.EXAMPLE_PARAM> {
  name: string;
  property: OmniProperty;
  description?: string | undefined;
  summary?: string | undefined;
  type: OmniType;
  value: unknown;
}

export interface OmniExampleResult extends OmniItemBase<typeof OmniItemKind.EXAMPLE_RESULT> {
  name: string;
  summary?: string | undefined;
  description?: string | undefined;
  type: OmniType;
  value: unknown;
}

export interface OmniExamplePairing extends OmniItemBase<typeof OmniItemKind.EXAMPLE_PAIRING> {
  name: string;
  description?: string | undefined;
  summary?: string | undefined;
  params?: OmniExampleParam[] | undefined;
  result: OmniExampleResult | undefined;
}

export enum OmniComparisonOperator {
  EQUALS,
  DEFINED,
}

export interface OmniPayloadPathQualifier extends OmniItemBase<typeof OmniItemKind.PAYLOAD_PATH_QUALIFIER> {
  path: string[];
  operator: OmniComparisonOperator;
  value?: unknown;
}

export interface OmniCallback extends OmniItemBase<typeof OmniItemKind.CALLBACK> {
  name: string;
  description?: string | undefined;
  summary?: string | undefined;
  deprecated?: boolean;

  transport: OmniTransport;

  request: OmniInput;
  responses: OmniOutput[];

  examples?: OmniExamplePairing[] | undefined;
}

export interface OmniHttpTransport extends OmniItemBase<typeof OmniItemKind.TRANSPORT_HTTP> {
  async: false;
  path: string;
}

export interface OmniMessageQueueTransport extends OmniItemBase<typeof OmniItemKind.TRANSPORT_MQ> {
  async: true;
  path: string;
}

export type OmniTransport =
  OmniHttpTransport
  | OmniMessageQueueTransport;

export interface OmniEndpoint extends OmniItemBase<typeof OmniItemKind.ENDPOINT> {
  name: string;
  description?: string | undefined;
  summary?: string | undefined;
  deprecated?: boolean;

  transports: OmniTransport[];

  externalDocumentations?: OmniExternalDocumentation[] | undefined;
  requestQualifiers?: OmniPayloadPathQualifier[] | undefined;

  request: OmniInput;
  responses: OmniOutput[];

  callbacks?: OmniCallback[] | undefined;

  examples?: OmniExamplePairing[] | undefined;
}

export interface OmniServer extends OmniItemBase<typeof OmniItemKind.SERVER> {
  name: string | undefined;
  description?: string | undefined;
  summary?: string | undefined;
  url: string;
  variables: Map<string, unknown>;
}

export interface OmniExternalDocumentation extends OmniItemBase<typeof OmniItemKind.EXTERNAL_DOCUMENTATION> {
  url: string;
  description?: string | undefined;
}

export interface OmniLicense extends OmniItemBase<typeof OmniItemKind.LICENSE> {
  name: string;
  url?: string | undefined;
}

export interface OmniContact extends OmniItemBase<typeof OmniItemKind.CONTACT> {
  name?: string | undefined;
  email?: string | undefined;
  url?: string | undefined;
}

export interface OmniLinkSourceParameter extends OmniItemBase<typeof OmniItemKind.LINK_SOURCE_PARAMETER> {
  propertyPath?: OmniProperty[] | undefined;
  constantValue?: unknown;
}

export interface OmniLinkTargetParameter extends OmniItemBase<typeof OmniItemKind.LINK_TARGET_PARAMETER> {
  propertyPath: OmniProperty[];
}

export interface OmniLinkMapping extends OmniItemBase<typeof OmniItemKind.LINK_MAPPING> {
  source: OmniLinkSourceParameter;
  target: OmniLinkTargetParameter;
}

export interface OmniLink extends OmniItemBase<typeof OmniItemKind.LINK> {
  sourceModel?: OmniModel | undefined;
  targetModel?: OmniModel | undefined;
  mappings: OmniLinkMapping[];

  description?: string | undefined;
  summary?: string | undefined;

  server?: OmniServer | undefined;
}

export interface OmniModel extends OmniItemBase<typeof OmniItemKind.MODEL> {
  name?: string;

  /**
   * TODO: Remove the optionality, this should always be required to uniquely identify a model. Based on disk uri or remote web uri, etc
   */
  absoluteUri?: string;

  description?: string | undefined;
  /**
   * The version of the schema itself, and not of the originating source schema type's specification version.
   */
  version?: string | undefined;
  schemaType: 'openrpc' | 'openapi' | 'jsonschema' | 'other';
  /**
   * The version of the source schema
   */
  schemaVersion?: string | undefined;
  contact?: OmniContact | undefined;
  license?: OmniLicense | undefined;
  termsOfService?: string | undefined;
  endpoints: OmniEndpoint[];
  types: OmniType[];
  servers?: OmniServer[] | undefined;
  externalDocumentations?: OmniExternalDocumentation[] | undefined;
  continuations?: OmniLink[] | undefined;
}

