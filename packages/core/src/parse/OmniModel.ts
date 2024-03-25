import {TypeName} from './TypeName';
import {OmniTypeKind} from './OmniTypeKind.ts';

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

export interface OmniProperty {

  name: OmniPropertyName;

  type: OmniType;
  /**
   * TODO: REMOVE! It is ugly and should not really be needed...
   * @deprecated Find some other way of finding this
   */
  owner: OmniPropertyOwner;

  description?: string | undefined;
  summary?: string | undefined;
  deprecated?: boolean;
  required?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  abstract?: true;

  accessLevel?: OmniAccessLevel;

  annotations?: OmniAnnotation[];
}

export type OmniPropertyOrphan = Omit<OmniProperty, 'owner'> & Partial<Pick<OmniProperty, 'owner'>>;

// TODO: Create an "OR" type and use that instead of types that lose information by going to a common denominator?

export type OmniArrayTypes = OmniArrayType | OmniArrayPropertiesByPositionType | OmniArrayTypesByPositionType;

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
  ;

export type OmniType =
  | OmniArrayTypes
  | OmniObjectType
  | OmniUnknownType
  | OmniDictionaryType
  | OmniHardcodedReferenceType
  | OmniExternalModelReferenceType
  | OmniPrimitiveType
  | OmniIntersectionType
  | OmniUnionType
  | OmniExclusiveUnionType
  | OmniNegationType
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

export interface OmniNamedType {

  /**
   * The name of the type.
   * The name is not necessarily unique. There might be many types with the same name, until late-stage name-resolution before rendering.
   */
  name: TypeName;
}

export type OmniOptionallyNamedType = Partial<OmniNamedType>;

export interface OmniTypeWithInnerType<T extends OmniType | OmniType[] = OmniType> {
  of: T;
}

export interface OmniExample<T> {
  value: T;
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
   * TODO: Implement! REMOVE the optional and make it required! ALL types MUST have an absolute uri, to make it possible to merge types between schemas/contracts
   */
  absoluteUri?: string | undefined;
  accessLevel?: OmniAccessLevel | undefined;
  title?: string | undefined;
  description?: string | undefined;
  summary?: string | undefined;

  debug?: string | undefined;

  examples?: OmniExample<unknown>[] | undefined;
}

export type OmniTypeOf<T extends OmniType, K extends OmniTypeKind> = Extract<T, { kind: K }>;

export type OmniTypeKindComposition = typeof OmniTypeKind.INTERSECTION | typeof OmniTypeKind.UNION | typeof OmniTypeKind.EXCLUSIVE_UNION | typeof OmniTypeKind.NEGATION;
export type OmniTypeComposition = OmniTypeOf<OmniType, OmniTypeKindComposition>;

export interface OmniCompositionTypeBase<T extends OmniType, K extends OmniTypeKindComposition> extends OmniBaseType<K>, OmniOptionallyNamedType {
  types: T[];
}

export interface OmniIntersectionType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, typeof OmniTypeKind.INTERSECTION> {}
export interface OmniUnionType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, typeof OmniTypeKind.UNION> {}
export interface OmniExclusiveUnionType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, typeof OmniTypeKind.EXCLUSIVE_UNION> {}
export interface OmniNegationType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, typeof OmniTypeKind.NEGATION> {}

export type OmniCompositionType<T extends OmniType = OmniType, CK extends OmniTypeKindComposition = OmniTypeKindComposition> = Extract<
  OmniIntersectionType<T>
  | OmniUnionType<T>
  | OmniExclusiveUnionType<T>
  | OmniNegationType<T>
  , {kind: CK}>
  ;


export interface OmniDictionaryType<K extends OmniType = OmniType, V extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.DICTIONARY> {
  keyType: K;
  valueType: V;
}


export interface OmniHardcodedReferenceType extends OmniBaseType<typeof OmniTypeKind.HARDCODED_REFERENCE> {
  fqn: string;
}

export interface OmniExternalModelReferenceType<TType extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.EXTERNAL_MODEL_REFERENCE>, OmniNamedType, OmniTypeWithInnerType<TType> {
  model: OmniModel;
  name: TypeName;
}

interface OmniArrayBase {
  arrayKind?: OmniArrayKind | undefined;
}

export interface OmniArrayType<Item extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.ARRAY>, OmniTypeWithInnerType<Item>, OmniArrayBase {
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

export interface OmniArrayTypesByPositionType extends OmniBaseType<typeof OmniTypeKind.ARRAY_TYPES_BY_POSITION>, OmniArrayBase {
  types: OmniType[];
  commonDenominator?: OmniType | undefined;
}


export interface OmniInterfaceType<T extends OmniSuperTypeCapableType = OmniSuperTypeCapableType> extends OmniBaseType<typeof OmniTypeKind.INTERFACE>, OmniOptionallyNamedType, OmniTypeWithInnerType<T> {

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
  MAP: 'MAP',
  MUTABLE_OBJECT: 'MUTABLE_OBJECT',
  OBJECT: 'OBJECT',

  /**
   * For language like Java this would represent '?', while in TypeScript this would represent 'unknown'
   */
  WILDCARD: 'WILDCARD',

  /**
   * Java: `Object`, TypeScript: `any`
   */
  ANY: 'ANY',
} as const;
export type UnknownKind = (typeof UnknownKind)[keyof typeof UnknownKind];

export interface OmniUnknownType extends OmniBaseType<typeof OmniTypeKind.UNKNOWN> {
  valueDefault?: OmniPrimitiveConstantValue | null;
  unknownKind?: UnknownKind;
  upperBound?: OmniType;
}

export interface OmniSubTypeHint {

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
  subTypeHints?: OmniSubTypeHint[];

  properties: OmniProperty[];

  abstract?: boolean | undefined;
}

export type OmniPrimitiveConstantValue = string | boolean | number

export interface OmniPrimitiveType extends OmniBaseType<OmniPrimitiveKinds>, OmniOptionallyNamedType {

  name?: TypeName;
  nullable?: boolean;

  /**
   * Means "default" if `literal` is false, means "constant value" if `literal` is true.
   */
  value?: OmniPrimitiveConstantValue | null | undefined;
  /**
   * aka 'const' / 'constant' -- cannot be set, it is a static, literal value that can be inlined without any issues.
   */
  literal?: boolean;
}

export type OmniPrimitiveNull = (OmniPrimitiveType & {kind: typeof OmniTypeKind.NULL});

export type OmniPrimitiveNullableType =
  (OmniPrimitiveType & {nullable: true})
  | OmniPrimitiveNull;

export type OmniPrimitiveTangibleKind = Exclude<OmniPrimitiveKinds, typeof OmniTypeKind.NULL | typeof OmniTypeKind.VOID>;

export type OmniNumericType<T extends OmniType> = OmniTypeOf<T, OmniNumericPrimitiveKinds>;

export type AllowedEnumTsTypes = number | string;

export type OmniNumericPrimitiveKinds =
  | typeof OmniTypeKind.INTEGER
  | typeof OmniTypeKind.INTEGER_SMALL
  | typeof OmniTypeKind.LONG
  | typeof OmniTypeKind.DOUBLE
  | typeof OmniTypeKind.FLOAT
  | typeof OmniTypeKind.DECIMAL
  | typeof OmniTypeKind.NUMBER;

export type OmniPrimitiveKinds =
  | OmniNumericPrimitiveKinds
  | typeof OmniTypeKind.STRING
  | typeof OmniTypeKind.CHAR
  | typeof OmniTypeKind.BOOL
  | typeof OmniTypeKind.VOID
  | typeof OmniTypeKind.NULL
  | typeof OmniTypeKind.UNDEFINED
  ;

export interface OmniEnumType extends OmniBaseType<typeof OmniTypeKind.ENUM>, OmniNamedType {
  enumConstants?: AllowedEnumTsTypes[];
  enumNames?: string[];
  enumDescriptions?: Record<string, string>;
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
  lowerBound?: Lower;
  upperBound?: Upper;

  /**
   * List of distinct known types used as bounds for the generic source.
   * This can be used to quickly know in some places what the implementations of a certain generic identifier is.
   */
  knownEdgeTypes?: Edges;
}

export interface OmniGenericTargetIdentifierType<T extends OmniType = OmniType> extends OmniBaseType<typeof OmniTypeKind.GENERIC_TARGET_IDENTIFIER> {

  /**
   * If no placeholder name is set, then it has the same placeholder name as the sourceIdentifier.
   */
  placeholderName?: string;
  sourceIdentifier: OmniGenericSourceIdentifierType;
  type: T;
}

/**
 * TODO: Rename this into a GenericDeclaration?
 */
export interface OmniGenericSourceType<T extends OmniSuperGenericTypeCapableType = OmniSuperGenericTypeCapableType> extends OmniBaseType<typeof OmniTypeKind.GENERIC_SOURCE>, OmniTypeWithInnerType<T> {

  sourceIdentifiers: OmniGenericSourceIdentifierType[];
}

export type OmniGenericTargetSourcePropertyType<T extends OmniSuperGenericTypeCapableType = OmniSuperGenericTypeCapableType> =
  OmniGenericSourceType<T>
  | OmniExternalModelReferenceType<OmniGenericSourceType<T>>;

export interface OmniGenericTargetType<T extends OmniSuperGenericTypeCapableType = OmniSuperGenericTypeCapableType> extends OmniBaseType<typeof OmniTypeKind.GENERIC_TARGET> {
  source: OmniGenericTargetSourcePropertyType<T>;
  targetIdentifiers: OmniGenericTargetIdentifierType[];
}

export interface OmniInput {
  description?: string;
  contentType: string;

  type: OmniType;
}

export interface OmniOutput {
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

export interface OmniExampleParam {
  name: string;
  property: OmniProperty;
  description?: string | undefined;
  summary?: string | undefined;
  type: OmniType;
  value: unknown;
}

export interface OmniExampleResult {
  name: string;
  summary?: string | undefined;
  description?: string | undefined;
  type: OmniType;
  value: unknown;
}

export interface OmniExamplePairing {
  name: string;
  description?: string;
  summary?: string;
  params?: OmniExampleParam[];
  result: OmniExampleResult;
}

export enum OmniComparisonOperator {
  EQUALS,
  DEFINED,
}

export interface OmniPayloadPathQualifier {
  path: string[];
  operator: OmniComparisonOperator;
  value?: unknown;
}

export interface OmniEndpoint {
  name: string;
  description?: string | undefined;
  summary?: string | undefined;
  async: boolean;
  deprecated?: boolean;
  path: string;
  externalDocumentations?: OmniExternalDocumentation[];
  requestQualifiers: OmniPayloadPathQualifier[];

  request: OmniInput;
  responses: OmniOutput[];
  examples: OmniExamplePairing[];
}

export interface OmniServer {
  name: string;
  description?: string;
  summary?: string;
  url: string;
  variables: Map<string, unknown>;
}

export interface OmniExternalDocumentation {
  url: string;
  description?: string;
}

export interface OmniLicense {
  name: string;
  url: string;
}

export interface OmniContact {
  name?: string;
  email?: string;
  url?: string;
}

export interface OmniLinkSourceParameter {
  propertyPath?: OmniProperty[];
  constantValue?: unknown;
}

export interface OmniLinkTargetParameter {
  propertyPath: OmniProperty[];
}

export interface OmniLinkMapping {
  source: OmniLinkSourceParameter;
  target: OmniLinkTargetParameter;
}

export interface OmniLink {
  sourceModel?: OmniModel;
  targetModel?: OmniModel;
  mappings: OmniLinkMapping[];

  description?: string;
  summary?: string;

  server?: OmniServer;
}

export interface OmniModel {
  name: string;

  /**
   * TODO: Remove the optionality, this should always be required to uniquely identify a model. Based on disk uri or remote web uri, etc
   */
  absoluteUri?: string;

  description?: string | undefined;
  /**
   * The version of the schema itself, and not of the originating source schema type's specification version.
   */
  version: string;
  schemaType: 'openrpc' | 'openapi' | 'jsonschema' | 'other';
  /**
   * The version of the source schema
   */
  schemaVersion: string;
  contact?: OmniContact | undefined;
  license?: OmniLicense | undefined;
  termsOfService?: string | undefined;
  endpoints: OmniEndpoint[];
  types: OmniType[];
  servers: OmniServer[];
  externalDocumentations?: OmniExternalDocumentation[];
  continuations?: OmniLink[];

  /**
   * Any options given from the schema to the model.
   * This can be absolutely anything, and it is up to some kind of conversion to decide how they should be used.
   *
   * @deprecated Remove one day -- it should not be needed elsewhere; it just feels wrong
   */
  options?: Record<string, unknown>;
}

