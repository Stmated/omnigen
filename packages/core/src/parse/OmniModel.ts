import {JSONSchema7Definition} from 'json-schema';

export type JSONSchema7Items = JSONSchema7Definition | JSONSchema7Definition[] | undefined;

export interface IOmniParameter {
  name: string;
  description?: string;
  summary?: string;
  type: OmniType;
  required: boolean;
  deprecated: boolean;
}

export interface IOmniAnnotation {
  name: string;
  parameters: IOmniParameter[];
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

export interface IOmniProperty {
  name: string;
  fieldName?: string;
  propertyName?: string;
  type: OmniType;
  owner: OmniPropertyOwner;

  description?: string;
  summary?: string;
  deprecated?: boolean;
  required?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;

  accessLevel?: OmniAccessLevel;

  annotations?: IOmniAnnotation[];
}

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

  /**
   * TODO: Should this be a primitive?
   */
  NULL = 'NULL',
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
}

type OmniAlwaysNullKnownKind = OmniTypeKind.NULL;
export type OmniNullType = IOmniBaseType<OmniAlwaysNullKnownKind>;

// TODO: Create an "OR" type and use that instead of types that lose information by going to a common denominator?

export type OmniArrayTypes = IOmniArrayType | IOmniArrayPropertiesByPositionType | IOmniArrayTypesByPositionType;
export type OmniCompositionType = IOmniCompositionAndType | IOmniCompositionXorType | IOmniCompositionOrType | IOmniCompositionNotType;
export type OmniGenericIdentifierType = IOmniGenericSourceIdentifierType | IOmniGenericTargetIdentifierType;
export type OmniGenericType = OmniGenericIdentifierType | IOmniGenericSourceType | IOmniGenericTargetType;
export type OmniInheritableType = IOmniObjectType
  | IOmniGenericTargetType
  | OmniCompositionType
  | IOmniEnumType
  | IOmniInterfaceType
  | IOmniExternalModelReferenceType<OmniInheritableType> // Needs to be unwrapped/resolved every time
  ;

export type OmniType = OmniNullType
  | OmniArrayTypes
  | IOmniObjectType
  | IOmniUnknownType
  | IOmniDictionaryType
  | IOmniHardcodedReferenceType
  | IOmniExternalModelReferenceType<OmniType>
  | IOmniPrimitiveType
  | OmniCompositionType
  | IOmniEnumType
  | OmniGenericType
  | IOmniInterfaceType
  ;

export type TypeNameFn = (value: string) => boolean;
export type TypeNameCallback = { (hasDuplicateFn?: TypeNameFn): string | undefined };
export type TypeNameSingle = string | TypeNameCallback | undefined;
export type TypeName = TypeNameSingle | Array<TypeName>;

export interface IOmniNamedType {

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

export interface IOmniOptionallyNamedType {
  name?: TypeName;
}

export interface IOmniBaseType<T> {

  kind: T;
  accessLevel?: OmniAccessLevel;
  title?: string;
  description?: string;
  summary?: string;
  /**
   * TODO: Delete? It is up to more exact properties in more exact types if it is readonly or not?
   *        Like Literal's "constantValue"
   */
  // readOnly?: boolean;
  // writeOnly?: boolean;
}

export enum CompositionKind {
  AND,
  OR,
  XOR,
  NOT,
}

type GenericCompositionKnownKind = OmniTypeKind.COMPOSITION;

export interface IOmniCompositionBaseType<T> extends IOmniBaseType<GenericCompositionKnownKind>, IOmniOptionallyNamedType {
  compositionKind: T;
}

export interface IOmniCompositionAndType extends IOmniCompositionBaseType<CompositionKind.AND> {
  andTypes: OmniType[];
}

export interface IOmniCompositionNotType extends IOmniCompositionBaseType<CompositionKind.NOT> {
  /**
   * Only one is allowed.
   * But kept as an array to make it more similar to the other composition kinds.
   */
  notTypes: [OmniType];
}

export interface IOmniCompositionOrType extends IOmniCompositionBaseType<CompositionKind.OR> {
  orTypes: OmniType[];
}

export interface IOmniCompositionXorType extends IOmniCompositionBaseType<CompositionKind.XOR> {
  xorTypes: OmniType[];
}

type OmniDictionaryKnownKind = OmniTypeKind.DICTIONARY;
export interface IOmniDictionaryType extends IOmniBaseType<OmniDictionaryKnownKind> {
  keyType: OmniType;
  valueType: OmniType;
}

type OmniHardcodedReferenceKnownKind = OmniTypeKind.HARDCODED_REFERENCE;
export interface IOmniHardcodedReferenceType extends IOmniBaseType<OmniHardcodedReferenceKnownKind> {
  fqn: string;
}

type OmniExternalModelReferenceKnownKind = OmniTypeKind.EXTERNAL_MODEL_REFERENCE;
export interface IOmniExternalModelReferenceType<TType extends OmniType> extends IOmniBaseType<OmniExternalModelReferenceKnownKind> {
  model: IOmniModel;
  of: TType;
  /**
   * @deprecated REMOVE! NOT NEEDED!
   */
  name: TypeName | undefined
}

type OmniArrayKnownKind = OmniTypeKind.ARRAY;
export interface IOmniArrayType extends IOmniBaseType<OmniArrayKnownKind> {
  of: OmniType;
  minLength?: number;
  maxLength?: number;
  implementationType?: OmniArrayImplementationType;
  possiblySingle?: boolean;
}

type OmniArrayPropertiesByPositionKnownKind = OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION;

export type OmniPropertyOwner = IOmniObjectType | IOmniArrayPropertiesByPositionType;

/**
 * Similar to GenericArrayType, but this solves issue of having a list of types in a static order.
 * It DOES NOT mean "any of these types" or "one of these types", it means "THESE TYPES IN THIS ORDER IN THIS ARRAY"
 */
export interface IOmniArrayPropertiesByPositionType extends IOmniBaseType<OmniArrayPropertiesByPositionKnownKind> {

  properties: IOmniProperty[];
  commonDenominator?: OmniType;
  implementationType?: OmniArrayImplementationType;
}

type OmniArrayTypesByPositionKnownKind = OmniTypeKind.ARRAY_TYPES_BY_POSITION;
export interface IOmniArrayTypesByPositionType extends IOmniBaseType<OmniArrayTypesByPositionKnownKind> {

  types: OmniType[];
  commonDenominator?: OmniType;
  implementationType?: OmniArrayImplementationType;
}

type OmniInterfaceTypeKnownKind = OmniTypeKind.INTERFACE;

export interface IOmniInterfaceType extends IOmniBaseType<OmniInterfaceTypeKnownKind>, IOmniOptionallyNamedType {
  of: OmniInheritableType;

  /**
   * This is a replacement of any potential 'extendedBy' inside the original type inside 'of'.
   * That is because all the subtypes of the interface must also be converted into an interface.
   * We cannot change the 'extendedBy' of the original type.
   */
  extendedBy?: OmniType;
}

type OmniUnknownKnownKind = OmniTypeKind.UNKNOWN;
export interface IOmniUnknownType extends IOmniBaseType<OmniUnknownKnownKind> {
  valueConstant?: OmniPrimitiveConstantValue;
  isAny?: boolean;
}

type OmniObjectKnownKind = OmniTypeKind.OBJECT;

export interface IOmniSubTypeHint {

  type: OmniType;
  qualifiers: IOmniPayloadPathQualifier[];
}

export interface IOmniObjectType extends IOmniBaseType<OmniObjectKnownKind>, IOmniNamedType {

  /**
   * This type can only be extended by "one" thing.
   * But this one thing can be a GenericAndType or GenericOrType or anything else.
   * This extension property tries to follow the originating specification as much as possible.
   * It is up to the target language what to do with it/how to transform it to something useful.
   *
   * TODO: This should be OmniInheritableType -- but the infrastructure doesn't handle it well right now.
   */
  extendedBy?: OmniInheritableType;

  /**
   * The composition types that inherit this interface can help with the mapping of the runtime types.
   * If there is a runtime mapping, then we do not need to do it manually in the target language's code.
   * This is predicated on the language having some other method of doing it, though. Like Java @JsonTypeInfo and @JsonSubTypes
   */
  subTypeHints?: IOmniSubTypeHint[];

  properties: IOmniProperty[];
  // requiredProperties?: OmniProperty[];
  additionalProperties?: boolean;
}

type OmniPrimitiveKnownKind = OmniTypeKind.PRIMITIVE;
export type OmniPrimitiveConstantValue = string | boolean | number

/**
 * This means that it is either directly a constant value,
 * or it is a lazy value that should be produced as late as possible in the code generation.
 */
export type OmniPrimitiveConstantValueOrLazySubTypeValue = OmniPrimitiveConstantValue | {(subtype: OmniType): OmniPrimitiveConstantValue};

export enum PrimitiveNullableKind {
  NOT_NULLABLE,
  NULLABLE,
  NOT_NULLABLE_PRIMITIVE,
}

export interface IOmniPrimitiveType extends IOmniBaseType<OmniPrimitiveKnownKind> {
  primitiveKind: OmniPrimitiveKind;
  /**
   * Nullable means the primitive is for example not a "boolean" but a nullable "Boolean"
   */
  nullable?: PrimitiveNullableKind;
  valueConstant?: OmniPrimitiveConstantValueOrLazySubTypeValue;
  valueConstantOptional?: boolean;
}

export type OmniPrimitiveTypeKinds = OmniPrimitiveKind.INTEGER
  | OmniPrimitiveKind.INTEGER_SMALL
  | OmniPrimitiveKind.DOUBLE
  | OmniPrimitiveKind.FLOAT
  | OmniPrimitiveKind.DECIMAL
  | OmniPrimitiveKind.NUMBER;

export type AllowedEnumTsTypes = number | string;
export type AllowedEnumOmniPrimitiveTypes = OmniPrimitiveKind.STRING | OmniPrimitiveTypeKinds;

type OmniEnumKnownKind = OmniTypeKind.ENUM;
export interface IOmniEnumType extends IOmniBaseType<OmniEnumKnownKind>, IOmniNamedType {
  enumConstants?: AllowedEnumTsTypes[];
  primitiveKind: AllowedEnumOmniPrimitiveTypes;

  /**
   * If this is true, then the enum actually also need to support any other value outside of the constants.
   * This could happen if the JSONSchema is a composition of "String or Enum[A, B, C]".
   * Then the A, B, C choices need to be there, but we also need to support in case something else is received.
   *
   * For Java this would mean we should not render as an Enum, but as a class with static public final fields.
   */
  otherValues?: boolean;
}

type OmniGenericSourceIdentifierKnownKind = OmniTypeKind.GENERIC_SOURCE_IDENTIFIER;
// TODO: Should this actually be a type, and not just something simpler? Since it can ONLY exist inside a OmniGenericSourceType...
export interface IOmniGenericSourceIdentifierType extends IOmniBaseType<OmniGenericSourceIdentifierKnownKind> {

  placeholderName: string;
  lowerBound?: OmniType;
  upperBound?: OmniType;
}

type OmniGenericTargetIdentifierKnownKind = OmniTypeKind.GENERIC_TARGET_IDENTIFIER;
export interface IOmniGenericTargetIdentifierType extends IOmniBaseType<OmniGenericTargetIdentifierKnownKind> {

  /**
   * If no placeholder name is set, then it has the same placeholder name as the sourceIdentifier.
   */
  placeholderName?: string;
  sourceIdentifier: IOmniGenericSourceIdentifierType;
  type: OmniType;
}

type OmniGenericSourceKnownKind = OmniTypeKind.GENERIC_SOURCE;

/**
 * TODO: Rename this into a GenericDeclaration?
 */
export interface IOmniGenericSourceType extends IOmniBaseType<OmniGenericSourceKnownKind> {
  of: IOmniObjectType;
  sourceIdentifiers: IOmniGenericSourceIdentifierType[];
}

type OmniGenericTargetKnownKind = OmniTypeKind.GENERIC_TARGET;
export interface IOmniGenericTargetType extends IOmniBaseType<OmniGenericTargetKnownKind> {
  source: IOmniGenericSourceType;
  targetIdentifiers: IOmniGenericTargetIdentifierType[];
}

export interface IOmniInput {
  description?: string;
  contentType: string;

  type: OmniType;
}

export interface IOmniOutput {
  name: string;
  description?: string;
  summary?: string;
  contentType: string;
  type: OmniType;
  required: boolean;
  deprecated: boolean;

  qualifiers?: IOmniPayloadPathQualifier[];
}

export interface IOmniExampleParam {
  name: string;
  property: IOmniProperty;
  description?: string;
  summary?: string;
  type: OmniType;
  value: unknown;
}

export interface IOmniExampleResult {
  name: string;
  summary?: string;
  description?: string;
  type: OmniType;
  value: unknown;
}

export interface IOmniExamplePairing {
  name: string;
  description?: string;
  summary?: string;
  params?: IOmniExampleParam[];
  result: IOmniExampleResult;
}

export enum OmniComparisonOperator {
  EQUALS,
  DEFINED,
}

export interface IOmniPayloadPathQualifier {
  path: string[];
  operator: OmniComparisonOperator;
  value?: unknown;
}

export interface IOmniEndpoint {
  name: string;
  description?: string;
  summary?: string;
  async: boolean;
  deprecated?: boolean;
  path: string;
  externalDocumentations?: IOmniExternalDocumentation[];
  requestQualifiers: IOmniPayloadPathQualifier[];

  request: IOmniInput;
  responses: IOmniOutput[];
  examples: IOmniExamplePairing[];

  // parameters: GenericParameter[];
}

export interface IOmniServer {
  name: string;
  description?: string;
  summary?: string;
  url: string;
  variables: Map<string, unknown>;
}

export interface IOmniExternalDocumentation {
  url: string;
  description?: string;
}

export interface IOmniLicense {
  name: string;
  url: string;
}

export interface IOmniContact {
  name?: string;
  email?: string;
  url?: string;
}

export interface IOmniLinkSourceParameter {
  propertyPath?: IOmniProperty[];
  constantValue?: unknown;
}

export interface IOmniLinkTargetParameter {
  propertyPath: IOmniProperty[];
}

export interface IOmniLinkMapping {
  source: IOmniLinkSourceParameter;
  target: IOmniLinkTargetParameter;
}

export interface IOmniLink {
  sourceModel?: IOmniModel;
  targetModel?: IOmniModel;
  mappings: IOmniLinkMapping[];

  description?: string;
  summary?: string;

  server?: IOmniServer;
}

export interface IOmniModel {
  name: string;
  description?: string;
  version: string;
  schemaType: 'openrpc' | 'openapi' | 'other';
  schemaVersion: string;
  contact?: IOmniContact;
  license?: IOmniLicense;
  termsOfService?: string;
  endpoints: IOmniEndpoint[];
  types: OmniType[];
  servers: IOmniServer[];
  externalDocumentations?: IOmniExternalDocumentation[];
  continuations?: IOmniLink[];

  /**
   * Any options given from the schema to the model.
   * This can be absolutely anything, and it is up to some kind of conversion to decide how they should be used.
   *
   * @deprecated Remove one day -- it should not be needed elsewhere; it just feels wrong
   */
  options?: Record<string, unknown>;
}

