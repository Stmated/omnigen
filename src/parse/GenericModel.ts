

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
  ARRAY_STATIC,
  /**
   * Type used when the type is known to be unknown.
   * It is a way of saying "it is an object, but it can be anything"
   */
  UNKNOWN,
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
export type GenericType = GenericBaseType<GenericAlwaysNullKnownKind> | GenericArrayType | GenericStaticArrayType | GenericClassType | GenericDictionaryType | GenericReferenceType | GenericPrimitiveType | GenericEnumType;

export interface GenericBaseType<T> {
  name: string;
  kind: T;
  accessLevel?: GenericAccessLevel;
  description?: string;
  summary?: string;
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
}

type GenericStaticArrayKnownKind = GenericTypeKind.ARRAY_STATIC;

export interface GenericStaticArrayEntry {
  name: string;
  description?: string;
  summary?: string;
  type: GenericType;
}

/**
 * Similar to GenericArrayType, but this solves issue of having a list of types in a static order.
 * It DOES NOT mean "any of these types" or "one of these types", it means "THESE TYPES IN THIS ORDER IN THIS ARRAY"
 */
export interface GenericStaticArrayType extends GenericBaseType<GenericStaticArrayKnownKind>{

  of: GenericStaticArrayEntry[];
  commonDenominator?: GenericType;
  implementationType?: GenericArrayImplementationType;
}

type GenericClassKnownKind = GenericTypeKind.OBJECT | GenericTypeKind.UNKNOWN; // TODO: Should Unknown be own type?
export interface GenericClassType extends GenericBaseType<GenericClassKnownKind> {

  valueConstant?: unknown;

  extendsAnyOf?: GenericClassType[];
  extendsAllOf?: GenericClassType[];
  extendsOneOf?: GenericClassType[];

  properties?: GenericProperty[];
  requiredProperties?: GenericProperty[];
  additionalProperties: boolean;

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
type AllowedEnumTypes = number | string;
export interface GenericEnumType extends GenericBaseType<GenericEnumKnownKind> {
  enumConstants?: AllowedEnumTypes[];
  enumType?: GenericClassType;
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
  description?: string;
  summary?: string;
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
}
