import {JSONSchema7Definition} from 'json-schema';
// @ts-ignore
import {TypeName} from './TypeName.js';

export type JSONSchema7Items = JSONSchema7Definition | JSONSchema7Definition[] | undefined;

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

export enum OmniAccessLevel {
  PRIVATE,
  PUBLIC,
  PACKAGE,
}

export enum OmniArrayImplementationType {
  PRIMITIVE,
  LIST,
  SET,
}

export interface OmniProperty {
  /**
   * The name of the property when it will be serialized/deserialized.
   */
  name: string;
  /**
   * The preferred name of the field when it is placed in an object.
   */
  fieldName?: string | undefined;
  /**
   * The preferred name of the property when it is placed in an object (basis for getter and setter method names)
   */
  propertyName?: string | undefined;
  type: OmniType;
  owner: OmniPropertyOwner;

  description?: string | undefined;
  summary?: string | undefined;
  deprecated?: boolean;
  /**
   * TODO: Move this into the type? A validation hint?
   */
  required?: boolean;
  /**
   * TODO: Move this into the type? A validation hint?
   */
  readOnly?: boolean;
  /**
   * TODO: Move this into the type? A validation hint?
   */
  writeOnly?: boolean;

  accessLevel?: OmniAccessLevel;

  annotations?: OmniAnnotation[];
}

export type OmniPropertyOrphan = Omit<OmniProperty, 'owner'> & Partial<Pick<OmniProperty, 'owner'>>;

/**
 * TODO: Change this into the values being strings instead. Maybe a bit more memory, but easier to read
 */
export enum OmniTypeKind {
  PRIMITIVE = 'PRIMITIVE',
  ENUM = 'ENUM',
  OBJECT = 'OBJECT',
  HARDCODED_REFERENCE = 'HARDCODED_REFERENCE',
  /**
   * The type lies in another, outside model.
   * Most likely a model that contains types common to multiple other models.
   */
  EXTERNAL_MODEL_REFERENCE = 'EXTERNAL_MODEL_REFERENCE',
  DICTIONARY = 'DICTIONARY',
  ARRAY = 'ARRAY',
  ARRAY_PROPERTIES_BY_POSITION = 'ARRAY_PROPERTIES_BY_POSITION',
  ARRAY_TYPES_BY_POSITION = 'ARRAY_TYPES_BY_POSITION',
  COMPOSITION = 'COMPOSITION',
  GENERIC_SOURCE = 'GENERIC_SOURCE',
  GENERIC_TARGET = 'GENERIC_TARGET',
  GENERIC_SOURCE_IDENTIFIER = 'GENERIC_SOURCE_IDENTIFIER',
  GENERIC_TARGET_IDENTIFIER = 'GENERIC_TARGET_IDENTIFIER',
  INTERFACE = 'INTERFACE',
  /**
   * Type used when the type is known to be unknown.
   * It is a way of saying "it is an object, but it can be anything"
   */
  UNKNOWN = 'UNKNOWN',
}

export enum OmniPrimitiveKind {
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  INTEGER_SMALL = 'INTEGER_SMALL',
  DECIMAL = 'DECIMAL',
  DOUBLE = 'DOUBLE',
  FLOAT = 'FLOAT',
  LONG = 'LONG',
  STRING = 'STRING',
  CHAR = 'CHAR',
  BOOL = 'BOOL',
  VOID = 'VOID',
  NULL = 'NULL',
}

// TODO: Create an "OR" type and use that instead of types that lose information by going to a common denominator?

export type OmniArrayTypes = OmniArrayType | OmniArrayPropertiesByPositionType | OmniArrayTypesByPositionType;

export type OmniGenericIdentifierType = OmniGenericSourceIdentifierType | OmniGenericTargetIdentifierType;
export type OmniGenericType = OmniGenericIdentifierType | OmniGenericSourceType | OmniGenericTargetType;
export type OmniSubtypeCapableType = OmniObjectType
  | OmniEnumType
  | OmniInterfaceType
  | OmniExternalModelReferenceType<OmniSubtypeCapableType>
  ;

/**
 * TODO: Not a good name. Need to make it clearer that an Object can be an Interface in a target language
 *        And that this type represents both possibilities.
 */
export type OmniPotentialInterfaceType = OmniInterfaceType | OmniObjectType;

// This might need to be moved to be more language-specific, since it is probably not true for most languages
export type OmniSuperTypeCapableType = OmniObjectType
  | OmniGenericTargetType
  | OmniCompositionType<OmniSuperTypeCapableType, CompositionKind>
  | OmniEnumType
  | OmniInterfaceType
  | OmniExternalModelReferenceType<OmniSuperTypeCapableType> // Needs to be unwrapped/resolved every time
  ;

export type OmniSuperGenericTypeCapableType = OmniObjectType
  | OmniInterfaceType
  | OmniExternalModelReferenceType<OmniSuperGenericTypeCapableType> // Needs to be unwrapped/resolved every time
  ;

export type OmniType =
  | OmniArrayTypes
  | OmniObjectType
  | OmniUnknownType
  | OmniDictionaryType
  | OmniHardcodedReferenceType
  | OmniExternalModelReferenceType<OmniType>
  | OmniPrimitiveType
  | OmniCompositionType<OmniType, CompositionKind>
  | OmniEnumType
  | OmniGenericType
  | OmniInterfaceType
  ;

export type SmartUnwrappedType<T> =
  T extends undefined
    ? undefined
    : T extends OmniExternalModelReferenceType<infer R>
      ? Exclude<R, OmniExternalModelReferenceType<any>>
      : T;

export interface OmniNamedType {

  /**
   * The name of the type.
   * The name is not necessarily unique. There might be many types with the same name.
   * Generally, only the OmniClassType is generally more certain to be unique.
   *
   * TODO: Make this into a possibility of being an array as well, and remove "nameClassifier"
   *        Maybe remake TypeName so that the array is lazily calculated, to decrease load
   */
  name: TypeName;
}

export type OmniOptionallyNamedType = Partial<OmniNamedType>;

export interface OmniBaseType<T> {

  kind: T;
  accessLevel?: OmniAccessLevel;
  title?: string | undefined;
  description?: string | undefined;
  summary?: string | undefined;

  debug?: string;
}

export enum CompositionKind {
  AND = 'AND',
  OR = 'OR',
  XOR = 'XOR',
  NOT = 'NOT',
}

type GenericCompositionKnownKind = OmniTypeKind.COMPOSITION;

export interface OmniCompositionType<T extends OmniType, K extends CompositionKind> extends OmniBaseType<GenericCompositionKnownKind>, OmniOptionallyNamedType {
  compositionKind: K;
  types: T[];
}

type OmniDictionaryKnownKind = OmniTypeKind.DICTIONARY;

export interface OmniDictionaryType extends OmniBaseType<OmniDictionaryKnownKind> {
  keyType: OmniType;
  valueType: OmniType;
}

type OmniHardcodedReferenceKnownKind = OmniTypeKind.HARDCODED_REFERENCE;

export interface OmniHardcodedReferenceType extends OmniBaseType<OmniHardcodedReferenceKnownKind> {
  fqn: string;
}

type OmniExternalModelReferenceKnownKind = OmniTypeKind.EXTERNAL_MODEL_REFERENCE;

export interface OmniExternalModelReferenceType<TType extends OmniType> extends OmniBaseType<OmniExternalModelReferenceKnownKind> {
  model: OmniModel;
  of: TType;
  name: TypeName;
}

type OmniArrayKnownKind = OmniTypeKind.ARRAY;

export interface OmniArrayType extends OmniBaseType<OmniArrayKnownKind> {
  of: OmniType;
  minLength?: number | undefined;
  maxLength?: number | undefined;
  implementationType?: OmniArrayImplementationType;
  possiblySingle?: boolean;
}

type OmniArrayPropertiesByPositionKnownKind = OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION;

export type OmniPropertyOwner = OmniObjectType | OmniArrayPropertiesByPositionType;

/**
 * Similar to GenericArrayType, but this solves issue of having a list of types in a static order.
 * It DOES NOT mean "any of these types" or "one of these types", it means "THESE TYPES IN THIS ORDER IN THIS ARRAY"
 */
export interface OmniArrayPropertiesByPositionType extends OmniBaseType<OmniArrayPropertiesByPositionKnownKind> {

  properties: OmniProperty[];
  commonDenominator?: OmniType | undefined;
  implementationType?: OmniArrayImplementationType | undefined;
}

type OmniArrayTypesByPositionKnownKind = OmniTypeKind.ARRAY_TYPES_BY_POSITION;

export interface OmniArrayTypesByPositionType extends OmniBaseType<OmniArrayTypesByPositionKnownKind> {

  types: OmniType[];
  commonDenominator?: OmniType | undefined;
  implementationType?: OmniArrayImplementationType | undefined;
}

type OmniInterfaceTypeKnownKind = OmniTypeKind.INTERFACE;

export interface OmniInterfaceType extends OmniBaseType<OmniInterfaceTypeKnownKind>, OmniOptionallyNamedType {
  of: OmniSuperTypeCapableType;

  /**
   * This is a replacement of any potential 'extendedBy' inside the original type inside 'of'.
   * That is because all the subtypes of the interface must also be converted into an interface.
   * We cannot change the 'extendedBy' of the original type.
   */
  extendedBy?: OmniSuperTypeCapableType | undefined;
}

type OmniUnknownKnownKind = OmniTypeKind.UNKNOWN;

export interface OmniUnknownType extends OmniBaseType<OmniUnknownKnownKind> {
  valueDefault?: OmniPrimitiveConstantValue | null;
  isAny?: boolean;
}

type OmniObjectKnownKind = OmniTypeKind.OBJECT;

export interface OmniSubTypeHint {

  type: OmniType;
  qualifiers: OmniPayloadPathQualifier[];
}

export interface OmniObjectType extends OmniBaseType<OmniObjectKnownKind>, OmniNamedType {

  /**
   * This type can only be extended by "one" thing.
   * But this one thing can be a GenericAndType or GenericOrType or anything else.
   * This extension property tries to follow the originating specification as much as possible.
   * It is up to the target language what to do with it/how to transform it to something useful.
   *
   * TODO: This should be OmniInheritableType -- but the infrastructure doesn't handle it well right now.
   */
  extendedBy?: OmniSuperTypeCapableType | undefined;

  /**
   * The composition types that inherit this interface can help with the mapping of the runtime types.
   * If there is a runtime mapping, then we do not need to do it manually in the target language's code.
   * This is predicated on the language having some other method of doing it, though. Like Java @JsonTypeInfo and @JsonSubTypes
   */
  subTypeHints?: OmniSubTypeHint[];

  properties: OmniProperty[];
  additionalProperties?: boolean | undefined;
}

type OmniPrimitiveKnownKind = OmniTypeKind.PRIMITIVE;
export type OmniPrimitiveConstantValue = string | boolean | number

// export enum PrimitiveNullableKind {
//   NOT_NULLABLE,
//   NOT_NULLABLE_PRIMITIVE,
//   NULLABLE,
// }

export enum OmniPrimitiveValueMode {
  /**
   * This means the value is the default value of the type unless anything else has/can be set.
   */
  DEFAULT = 'DEFAULT',
  /**
   * This means that the value is the ONLY value that is allowed for the type.
   * It is not really the type, it is the value itself.
   */
  LITERAL = 'LITERAL',
}

export enum OmniPrimitiveBoxMode {
  /**
   * Box means for example 'int' -> 'Integer'
   */
  BOX = 'BOX',
  /**
   * Wrap means for example 'int' -> 'PrimitiveInt'.
   *
   * A custom-generated class to hold a forced non-null primitive int, but usable as a generic.
   */
  WRAP = 'WRAP',
}

export interface OmniPrimitiveBaseType extends OmniBaseType<OmniPrimitiveKnownKind> {

  /**
   * Undefined = OmniPrimitiveValueMode.DEFAULT
   */
  valueMode?: OmniPrimitiveValueMode;
}

/**
 * Nullable means the primitive is for example not a "boolean" but a nullable "Boolean"
 */
export interface OmniPrimitiveNullableType extends OmniPrimitiveBaseType {
  primitiveKind: OmniPrimitiveKind;
  nullable: true;
  boxMode?: OmniPrimitiveBoxMode;
  value?: OmniPrimitiveConstantValue | null;
}

export type OmniPrimitiveNonNullableKind = Exclude<OmniPrimitiveKind, OmniPrimitiveKind.NULL | OmniPrimitiveKind.VOID>;

export interface OmniPrimitiveNonNullableType extends OmniPrimitiveBaseType {
  primitiveKind: OmniPrimitiveNonNullableKind;
  nullable?: false,
  boxMode?: OmniPrimitiveBoxMode.WRAP;
  value?: OmniPrimitiveConstantValue;
}

export type OmniPrimitiveType = OmniPrimitiveNullableType | OmniPrimitiveNonNullableType

export type AllowedEnumTsTypes = number | string;
export type OmniAllowedEnumPrimitiveKinds = OmniPrimitiveKind.STRING
  | OmniPrimitiveKind.INTEGER
  | OmniPrimitiveKind.INTEGER_SMALL
  | OmniPrimitiveKind.DOUBLE
  | OmniPrimitiveKind.FLOAT
  | OmniPrimitiveKind.DECIMAL
  | OmniPrimitiveKind.NUMBER;

type OmniEnumKnownKind = OmniTypeKind.ENUM;

export interface OmniEnumType extends OmniBaseType<OmniEnumKnownKind>, OmniNamedType {
  enumConstants?: AllowedEnumTsTypes[];
  primitiveKind: OmniAllowedEnumPrimitiveKinds;

  /**
   * If this is true, then the enum actually also need to support any other value outside of the constants.
   * This could happen if the JSONSchema is a composition of "String or Enum[A, B, C]".
   * Then the A, B, C choices need to be there, but we also need to support in case something else is received.
   *
   * For Java this would mean we should not render as an Enum, but as a class with static public final fields.
   */
  otherValues?: boolean;

  extendedBy?: OmniSuperTypeCapableType;
}

type OmniGenericSourceIdentifierKnownKind = OmniTypeKind.GENERIC_SOURCE_IDENTIFIER;

// TODO: Should this actually be a type, and not just something simpler? Since it can ONLY exist inside a OmniGenericSourceType...
export interface OmniGenericSourceIdentifierType extends OmniBaseType<OmniGenericSourceIdentifierKnownKind> {

  placeholderName: string;
  lowerBound?: OmniType | undefined;
  upperBound?: OmniType | undefined;
}

type OmniGenericTargetIdentifierKnownKind = OmniTypeKind.GENERIC_TARGET_IDENTIFIER;

export interface OmniGenericTargetIdentifierType extends OmniBaseType<OmniGenericTargetIdentifierKnownKind> {

  /**
   * If no placeholder name is set, then it has the same placeholder name as the sourceIdentifier.
   */
  placeholderName?: string;
  sourceIdentifier: OmniGenericSourceIdentifierType;
  type: OmniType;
}

type OmniGenericSourceKnownKind = OmniTypeKind.GENERIC_SOURCE;

/**
 * TODO: Rename this into a GenericDeclaration?
 */
export interface OmniGenericSourceType extends OmniBaseType<OmniGenericSourceKnownKind> {
  of: OmniSuperGenericTypeCapableType;
  sourceIdentifiers: OmniGenericSourceIdentifierType[];
}

type OmniGenericTargetKnownKind = OmniTypeKind.GENERIC_TARGET;

export interface OmniGenericTargetType extends OmniBaseType<OmniGenericTargetKnownKind> {
  source: OmniGenericSourceType;
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

  qualifiers?: OmniPayloadPathQualifier[];
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

  // parameters: GenericParameter[];
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
  description?: string | undefined;
  version: string;
  schemaType: 'openrpc' | 'openapi' | 'other';
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

