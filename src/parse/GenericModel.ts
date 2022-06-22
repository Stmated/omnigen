

export interface GenericParameter {
  name: string;
  description?: string;
  summary?: string;
  type: GenericType;
  required: boolean;
  deprecated: boolean;
}

export interface GenericAnnotation {
  name: string;
  parameters: GenericParameter[];
}

export interface GenericMethod {
  name: string;
  parameters: GenericParameter[];
  returnType: GenericClassType;
  accessLevel: GenericAccessLevel;
}

export enum GenericAccessLevel {
  PRIVATE,
  PUBLIC,
  PACKAGE
}

export enum GenericArrayImplementationType {
  PRIMITIVE,
  LIST,
  SET
}

export interface GenericProperty {
  name: string;
  type: GenericType;
  owner: GenericPropertyOwner;

  description?: string;
  summary?: string;
  deprecated?: boolean;
  required?: boolean;

  accessLevel?: GenericAccessLevel;

  annotations?: GenericAnnotation[];
}

export enum GenericTypeKind {
  PRIMITIVE,

  ENUM,

  OBJECT,
  REFERENCE,
  DICTIONARY,
  ARRAY,
  ARRAY_PROPERTIES_BY_POSITION,
  ARRAY_TYPES_BY_POSITION,
  COMPOSITION,
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

export enum GenericPrimitiveKind {
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

type GenericAlwaysNullKnownKind = GenericTypeKind.NULL;
export type GenericNullType = GenericBaseType<GenericAlwaysNullKnownKind>;

// TODO: Create an "OR" type and use that instead of types that lose information by going to a common denominator?

export type GenericType = GenericNullType
  | GenericArrayType
  | GenericArrayPropertiesByPositionType
  | GenericArrayTypesByPositionType
  | GenericClassType
  | GenericDictionaryType
  | GenericReferenceType
  | GenericPrimitiveType
  | GenericCompositionType
  | GenericEnumType;

export type TypeName = string | {(): string};

export interface GenericBaseType<T> {
  name: TypeName;
  kind: T;
  accessLevel?: GenericAccessLevel;
  title?: string;
  description?: string;
  summary?: string;

  /**
   * Can be used to classify the type with something extra.
   * Can be helpful if there are multiple types that have the same "name",
   * but are used for different things throughout the schema.
   * For example "Pet" as a Param or "Pet" as a response.
   * Then instead of naming the types Pet and Pet1, it could be Pet and ResponsePet.
   *
   * TODO: Rename this into "tag" and use that system throughout?
   */
  nameClassifier?: string;
}

export enum CompositionKind {
  AND,
  OR,
  XOR,
  NOT
}

type GenericCompositionKnownKind = GenericTypeKind.COMPOSITION;
export interface GenericCompositionType extends GenericBaseType<GenericCompositionKnownKind>{
  compositionKind: CompositionKind;
  types: GenericType[];
}

type GenericDictionaryKnownKind = GenericTypeKind.DICTIONARY;
export interface GenericDictionaryType extends GenericBaseType<GenericDictionaryKnownKind>{
  keyType: GenericType;
  valueType: GenericType;
}

type GenericReferenceKnownKind = GenericTypeKind.REFERENCE;
export interface GenericReferenceType extends GenericBaseType<GenericReferenceKnownKind>{
  fqn: string;
}

type GenericArrayKnownKind = GenericTypeKind.ARRAY;
export interface GenericArrayType extends GenericBaseType<GenericArrayKnownKind>{
  of: GenericType;
  minLength?: number;
  maxLength?: number;
  implementationType?: GenericArrayImplementationType;
  possiblySingle?: boolean;
}

type GenericArrayPropertiesByPositionKnownKind = GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION;

export type GenericPropertyOwner = GenericClassType | GenericArrayPropertiesByPositionType;

/**
 * Similar to GenericArrayType, but this solves issue of having a list of types in a static order.
 * It DOES NOT mean "any of these types" or "one of these types", it means "THESE TYPES IN THIS ORDER IN THIS ARRAY"
 */
export interface GenericArrayPropertiesByPositionType extends GenericBaseType<GenericArrayPropertiesByPositionKnownKind>{

  properties: GenericProperty[];
  commonDenominator?: GenericType;
  implementationType?: GenericArrayImplementationType;
}

type GenericArrayTypesByPositionKnownKind = GenericTypeKind.ARRAY_TYPES_BY_POSITION;
export interface GenericArrayTypesByPositionType extends GenericBaseType<GenericArrayTypesByPositionKnownKind>{

  types: GenericType[];
  commonDenominator?: GenericType;
  implementationType?: GenericArrayImplementationType;
}

type GenericClassKnownKind = GenericTypeKind.OBJECT | GenericTypeKind.UNKNOWN; // TODO: Should Unknown be own type?
export interface GenericClassType extends GenericBaseType<GenericClassKnownKind> {

  valueConstant?: unknown;

  /**
   * This type can only be extended by "one" thing.
   * But this one thing can be a GenericAndType or GenericOrType or anything else.
   * This extension property tries to follow the originating specification as much as possible.
   * It is up to the target language what to do with it/how to transform it to something useful.
   */
  extendedBy?: GenericType;

  properties?: GenericProperty[];
  requiredProperties?: GenericProperty[];
  additionalProperties?: boolean;

  methods?: GenericMethod[];
  annotations?: GenericAnnotation[];

  nestedTypes?: GenericClassType[];
}

type GenericPrimitiveKnownKind = GenericTypeKind.PRIMITIVE;
// Exclude<GenericKnownType, GenericKnownType.OBJECT | GenericKnownType.UNKNOWN | GenericKnownType.ENUM>;
export interface GenericPrimitiveType extends GenericBaseType<GenericPrimitiveKnownKind> {
  primitiveKind: GenericPrimitiveKind;
  /**
   * Nullable means the primitive is for example not a "boolean" but a nullable "Boolean"
   */
  nullable?: boolean;
  valueConstant?: string | boolean | number;
}

type GenericEnumKnownKind = GenericTypeKind.ENUM;
export type AllowedEnumTypes = number | string;
export interface GenericEnumType extends GenericBaseType<GenericEnumKnownKind> {
  enumConstants?: AllowedEnumTypes[];
  primitiveKind: GenericPrimitiveKind;
}

export interface GenericInput {
  description?: string;
  contentType: string;

  type: GenericType;
}

export interface GenericOutput {
  name: string;
  description?: string;
  summary?: string;
  contentType: string;
  type: GenericType;
  required: boolean;
  deprecated: boolean;

  qualifiers?: GenericPayloadPathQualifier[];
}

export interface GenericError {
  /**
   * A Number that indicates the error type that occurred. This MUST be an integer.
   * The error codes from and including -32768 to -32000 are reserved for pre-defined errors.
   * These pre-defined errors SHOULD be assumed to be returned from any JSON-RPC api.
   */
  code: number;
  /**
   * A String providing a short description of the error. The message SHOULD be limited to a concise single sentence.
   */
  message: string;
  /**
   * A Primitive or Structured value that contains additional information about the error.
   * This may be omitted. The value of this member is defined by the Server (e.g. detailed error information, nested errors etc.).
   */
  data?: unknown;
}

export interface GenericExampleParam {
  name: string;
  property: GenericProperty;
  description?: string;
  summary?: string;
  type: GenericType;
  value: unknown;
}

export interface GenericExampleResult {
  name: string;
  summary?: string;
  description?: string;
  type: GenericType;
  value: unknown;
}

export interface GenericExamplePairing {
  name: string;
  description?: string;
  summary?: string;
  params?: GenericExampleParam[];
  result: GenericExampleResult;
}

export enum ComparisonOperator {
  EQUALS,
  DEFINED
}

export interface GenericPayloadPathQualifier {
  path: string[];
  operator: ComparisonOperator;
  value?: unknown;
}

export interface GenericEndpoint {
  name: string;
  description: string;
  summary?: string;
  async: boolean;
  deprecated: boolean;
  path: string;
  externalDocumentations?: GenericExternalDocumentation[];
  requestQualifiers: GenericPayloadPathQualifier[];

  request: GenericInput;
  responses: GenericOutput[];
  examples: GenericExamplePairing[];

  // parameters: GenericParameter[];
}

export interface GenericServer {
  name: string;
  description?: string;
  summary?: string;
  url: string;
  variables: Map<string, unknown>;
}

export interface GenericExternalDocumentation {
  url: string;
  description?: string;
}

export interface GenericLicense {
  name: string;
  url: string;
}

export interface GenericContact {
  name?: string;
  email?: string;
  url?: string;
}

export interface GenericContinuationSourceParameter {
  propertyPath?: GenericProperty[];
  constantValue?: unknown;
}

export interface GenericContinuationTargetParameter {
  propertyPath: GenericProperty[];
}

export interface GenericContinuationMapping {
  source: GenericContinuationSourceParameter;
  target: GenericContinuationTargetParameter;
}

export interface GenericContinuation {
  sourceModel?: GenericModel;
  targetModel?: GenericModel;
  mappings: GenericContinuationMapping[];

  description?: string;
  summary?: string;

  server?: GenericServer;
}

export interface GenericModel {
  name: string;
  description?: string;
  version: string;
  schemaType: string;
  schemaVersion: string;
  contact?: GenericContact;
  license?: GenericLicense;
  termsOfService?: string;
  endpoints: GenericEndpoint[];
  types: GenericType[];
  servers: GenericServer[];
  externalDocumentations?: GenericExternalDocumentation[];
  continuations?: GenericContinuation[];
}
