

export interface GenericParameter {
  //name: string;
  //type: GenericType;

  name: string;
  description?: string;
  summary?: string;
  //contentType: string;
  type: GenericTypeOrGenericArrayType;
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

export interface GenericArrayType {
  of: GenericTypeOrGenericArrayType;
  minLength?: number;
  maxLength?: number;
  implementationType?: GenericArrayImplementationType;
}

export type GenericTypeOrGenericArrayType = GenericType | GenericArrayType;

export interface GenericProperty {
  name: string;
  type: GenericTypeOrGenericArrayType;
  accessLevel?: GenericAccessLevel;

  annotations?: GenericAnnotation[];
}

export enum GenericTypeKind {
  PRIMITIVE,

  ENUM,

  OBJECT,
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
  DECIMAL,
  LONG,
  STRING,
  CHAR,
  BOOL,
}

type GenericAlwaysNullKnownKind = GenericTypeKind.NULL;
export type GenericType = GenericBaseType<GenericAlwaysNullKnownKind> | GenericClassType | GenericPrimitiveType | GenericEnumType;

export interface GenericBaseType<T> {
  name: string;
  kind: T;
  accessLevel?: GenericAccessLevel;
}

type GenericClassKnownKind = GenericTypeKind.OBJECT | GenericTypeKind.UNKNOWN;
export interface GenericClassType extends GenericBaseType<GenericClassKnownKind> {

  valueConstant?: unknown;

  extendsAnyOf?: GenericClassType[];
  extendsAllOf?: GenericClassType[];
  extendsOneOf?: GenericClassType[];
  implements?: GenericClassType[];

  properties?: GenericProperty[];
  requiredProperties?: GenericProperty[];
  methods?: GenericMethod[];
  annotations?: GenericAnnotation[];

  nestedTypes?: GenericClassType[];
}

type GenericPrimitiveKnownKind = GenericTypeKind.PRIMITIVE;
// Exclude<GenericKnownType, GenericKnownType.OBJECT | GenericKnownType.UNKNOWN | GenericKnownType.ENUM>;
export interface GenericPrimitiveType extends GenericBaseType<GenericPrimitiveKnownKind> {
  primitiveType: GenericPrimitiveKind;
  valueConstant?: string | boolean | number;
}

type GenericEnumKnownKind = GenericTypeKind.ENUM;
export interface GenericEnumType extends GenericBaseType<GenericEnumKnownKind> {
  enumConstants?: unknown[];
  enumType?: GenericClassType;
}

export interface GenericInput {
  description: string;
  contentType: string;
}

export interface GenericOutput {
  name: string;
  description?: string;
  summary?: string;
  contentType: string;
  type: GenericClassType;
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
  value: unknown;
}

export interface GenericExamplePairing {
  name: string;
  description?: string;
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

  parameters: GenericParameter[];
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
