import {JSONSchema7Definition} from 'json-schema';

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

export interface OmniMethod {
  name: string;
  parameters: OmniParameter[];
  returnType: OmniObjectType;
  accessLevel: OmniAccessLevel;
}

export enum OmniAccessLevel {
  PRIVATE,
  PUBLIC,
  PACKAGE
}

export enum OmniArrayImplementationType {
  PRIMITIVE,
  LIST,
  SET
}

export interface OmniProperty {
  name: string;
  fieldName?: string;
  propertyName?: string;
  type: OmniType;
  owner: OmniPropertyOwner;

  description?: string;
  summary?: string;
  deprecated?: boolean;
  required?: boolean;

  accessLevel?: OmniAccessLevel;

  annotations?: OmniAnnotation[];
}

/**
 * TODO: Change this into the values being strings instead. Maybe a bit more memory, but easier to read
 */
export enum OmniTypeKind {
  PRIMITIVE,
  ENUM,
  OBJECT,
  REFERENCE,
  DICTIONARY,
  ARRAY,
  ARRAY_PROPERTIES_BY_POSITION,
  ARRAY_TYPES_BY_POSITION,
  COMPOSITION,
  GENERIC_SOURCE,
  GENERIC_TARGET,
  GENERIC_SOURCE_IDENTIFIER,
  GENERIC_TARGET_IDENTIFIER,
  INTERFACE,
  /**
   * Type used when the type is known to be unknown.
   * It is a way of saying "it is an object, but it can be anything"
   */
  UNKNOWN,

  /**
   * TODO: Should this be a primitive?
   */
  NULL,
}

export enum OmniPrimitiveKind {
  NUMBER,
  INTEGER,
  INTEGER_SMALL,
  DECIMAL,
  DOUBLE,
  FLOAT,
  LONG,
  STRING,
  CHAR,
  BOOL,
  VOID
}

type OmniAlwaysNullKnownKind = OmniTypeKind.NULL;
export type OmniNullType = OmniBaseType<OmniAlwaysNullKnownKind>;

// TODO: Create an "OR" type and use that instead of types that lose information by going to a common denominator?

export type OmniArrayTypes = OmniArrayType | OmniArrayPropertiesByPositionType | OmniArrayTypesByPositionType;
export type OmniCompositionType = OmniCompositionAndType | OmniCompositionXORType | OmniCompositionORType | OmniCompositionNotType;
export type OmniGenericIdentifierType = OmniGenericSourceIdentifierType | OmniGenericTargetIdentifierType;
export type OmniGenericType = OmniGenericIdentifierType | OmniGenericSourceType | OmniGenericTargetType;
export type OmniInheritableType = OmniObjectType
  | OmniGenericTargetType
  | OmniCompositionType
  | OmniEnumType
  | OmniInterfaceType;

export type OmniType = OmniNullType
  | OmniArrayTypes
  | OmniObjectType
  | OmniUnknownType
  | OmniDictionaryType
  | OmniReferenceType
  | OmniPrimitiveType
  | OmniCompositionType
  | OmniEnumType
  | OmniGenericType
  | OmniInterfaceType;

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

export interface OmniBaseType<T> {

  kind: T;
  accessLevel?: OmniAccessLevel;
  title?: string;
  description?: string;
  summary?: string;
  /**
   * TODO: Delete? It is up to more exact properties in more exact types if it is readonly or not?
   *        Like Literal's "constantValue"
   */
  readOnly?: boolean;
  writeOnly?: boolean;
}

export enum CompositionKind {
  AND,
  OR,
  XOR,
  NOT
}

type GenericCompositionKnownKind = OmniTypeKind.COMPOSITION;

export interface OmniCompositionBaseType<T> extends OmniBaseType<GenericCompositionKnownKind>, IOmniOptionallyNamedType {
  compositionKind: T;
}

export interface OmniCompositionAndType extends OmniCompositionBaseType<CompositionKind.AND> {
  andTypes: OmniType[];
}

export interface OmniCompositionNotType extends OmniCompositionBaseType<CompositionKind.NOT> {
  /**
   * Only one is allowed.
   * But kept as an array to make it more similar to the other composition kinds.
   */
  notTypes: [OmniType];
}

export interface OmniCompositionORType extends OmniCompositionBaseType<CompositionKind.OR> {
  orTypes: OmniType[];
}

export interface OmniCompositionXORType extends OmniCompositionBaseType<CompositionKind.XOR> {
  xorTypes: OmniType[];
}

type OmniDictionaryKnownKind = OmniTypeKind.DICTIONARY;

export interface OmniDictionaryType extends OmniBaseType<OmniDictionaryKnownKind> {
  keyType: OmniType;
  valueType: OmniType;
}

type OmniReferenceKnownKind = OmniTypeKind.REFERENCE;

export interface OmniReferenceType extends OmniBaseType<OmniReferenceKnownKind> {
  fqn: string;
}

type OmniArrayKnownKind = OmniTypeKind.ARRAY;
export interface OmniArrayType extends OmniBaseType<OmniArrayKnownKind> {
  of: OmniType;
  minLength?: number;
  maxLength?: number;
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
  commonDenominator?: OmniType;
  implementationType?: OmniArrayImplementationType;
}

type OmniArrayTypesByPositionKnownKind = OmniTypeKind.ARRAY_TYPES_BY_POSITION;
export interface OmniArrayTypesByPositionType extends OmniBaseType<OmniArrayTypesByPositionKnownKind> {

  types: OmniType[];
  commonDenominator?: OmniType;
  implementationType?: OmniArrayImplementationType;
}

type OmniInterfaceTypeKnownKind = OmniTypeKind.INTERFACE;

export interface OmniInterfaceType extends OmniBaseType<OmniInterfaceTypeKnownKind>, IOmniOptionallyNamedType {
  of: OmniInheritableType;

  /**
   * This is a replacement of any potential 'extendedBy' inside the original type inside 'of'.
   * That is because all the subtypes of the interface must also be converted into an interface.
   * We cannot change the 'extendedBy' of the original type.
   */
  extendedBy?: OmniType;
}

type OmniUnknownKnownKind = OmniTypeKind.UNKNOWN;
export interface OmniUnknownType extends OmniBaseType<OmniUnknownKnownKind> {
  valueConstant?: unknown;
  isAny?: boolean;
}

type OmniNestableType = OmniObjectType | OmniEnumType;
type OmniObjectKnownKind = OmniTypeKind.OBJECT;

export interface OmniSubTypeHint {

  type: OmniType;
  qualifiers:  OmniPayloadPathQualifier[];
}

export interface OmniObjectType extends OmniBaseType<OmniObjectKnownKind>, IOmniNamedType {

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
  subTypeHints?: OmniSubTypeHint[];

  properties: OmniProperty[];
  requiredProperties?: OmniProperty[];
  additionalProperties?: boolean;

  annotations?: OmniAnnotation[];
  nestedTypes?: OmniNestableType[];
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

export interface OmniPrimitiveType extends OmniBaseType<OmniPrimitiveKnownKind> {
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
export interface OmniEnumType extends OmniBaseType<OmniEnumKnownKind>, IOmniNamedType {
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
export interface OmniGenericSourceIdentifierType extends OmniBaseType<OmniGenericSourceIdentifierKnownKind> {

  placeholderName: string;
  lowerBound?: OmniType;
  upperBound?: OmniType;
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
  of: OmniObjectType;
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
  description?: string;
  summary?: string;
  contentType: string;
  type: OmniType;
  required: boolean;
  deprecated: boolean;

  qualifiers?: OmniPayloadPathQualifier[];
}

export interface OmniExampleParam {
  name: string;
  property: OmniProperty;
  description?: string;
  summary?: string;
  type: OmniType;
  value: unknown;
}

export interface OmniExampleResult {
  name: string;
  summary?: string;
  description?: string;
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
  DEFINED
}

export interface OmniPayloadPathQualifier {
  path: string[];
  operator: OmniComparisonOperator;
  value?: unknown;
}

export interface OmniEndpoint {
  name: string;
  description?: string;
  summary?: string;
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
  description?: string;
  version: string;
  schemaType: 'openrpc' | 'openapi' | 'other';
  schemaVersion: string;
  contact?: OmniContact;
  license?: OmniLicense;
  termsOfService?: string;
  endpoints: OmniEndpoint[];
  types: OmniType[];
  servers: OmniServer[];
  externalDocumentations?: OmniExternalDocumentation[];
  continuations?: OmniLink[];
}
