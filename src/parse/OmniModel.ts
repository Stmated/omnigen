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
  returnType: OmniClassType;
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

export type OmniType = OmniNullType
  | OmniArrayTypes
  | OmniClassType
  | OmniDictionaryType
  | OmniReferenceType
  | OmniPrimitiveType
  | OmniCompositionType
  | OmniEnumType;

export type OmniArrayTypes = OmniArrayType | OmniArrayPropertiesByPositionType | OmniArrayTypesByPositionType;
export type OmniCompositionType = OmniCompositionDefaultType | OmniCompositionXORType;

export type TypeName = string | { (): string };

export interface OmniBaseType<T> {
  name: TypeName;
  kind: T;
  accessLevel?: OmniAccessLevel;
  title?: string;
  description?: string;
  summary?: string;
  readOnly?: boolean;
  writeOnly?: boolean;

  /**
   * Can be used to classify the type with something extra.
   * Can be helpful if there are multiple types that have the same "name",
   * but are used for different things throughout the schema.
   * For example "Pet" as a Param or "Pet" as a response.
   * Then instead of naming the types Pet and Pet1, it could be Pet and ResponsePet.
   *
   * TODO: Rename this into "tag" and use that system throughout?
   *        Or remove and make "name" able to return an array of possible names in ascending specificity?
   *          "Data" "DataObject" "DataSchemaObject" etc
   */
  nameClassifier?: string;
}

export enum CompositionKind {
  AND,
  OR,
  XOR,
  NOT
}

type GenericCompositionKnownKind = OmniTypeKind.COMPOSITION;

export interface OmniCompositionBaseType<T> extends OmniBaseType<GenericCompositionKnownKind> {
  compositionKind: T;
}

export interface OmniCompositionDefaultType extends OmniCompositionBaseType<CompositionKind.AND | CompositionKind.OR | CompositionKind.NOT> {
  types: OmniType[];
}

export interface OmniCompositionXORType extends OmniCompositionBaseType<CompositionKind.XOR> {
  mappingPropertyName: string;
  mappings: Map<string, OmniType>;

  /**
   * This array is for keeping all the types of the composition, but for XOR it should mainly be used
   * to figure out which types have specific mappings, and which are unmapped and need runtime solutions.
   */
  types: OmniType[];
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

export type OmniPropertyOwner = OmniClassType | OmniArrayPropertiesByPositionType;

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

type OmniClassKnownKind = OmniTypeKind.OBJECT | OmniTypeKind.UNKNOWN; // TODO: Should Unknown be own type?
export interface OmniClassType extends OmniBaseType<OmniClassKnownKind> {

  valueConstant?: unknown;

  /**
   * This type can only be extended by "one" thing.
   * But this one thing can be a GenericAndType or GenericOrType or anything else.
   * This extension property tries to follow the originating specification as much as possible.
   * It is up to the target language what to do with it/how to transform it to something useful.
   */
  extendedBy?: OmniType;

  properties?: OmniProperty[];
  requiredProperties?: OmniProperty[];
  additionalProperties?: boolean;

  methods?: OmniMethod[];
  annotations?: OmniAnnotation[];

  nestedTypes?: OmniClassType[];
}

type OmniPrimitiveKnownKind = OmniTypeKind.PRIMITIVE;

// Exclude<GenericKnownType, GenericKnownType.OBJECT | GenericKnownType.UNKNOWN | GenericKnownType.ENUM>;
export interface OmniPrimitiveType extends OmniBaseType<OmniPrimitiveKnownKind> {
  primitiveKind: OmniPrimitiveKind;
  /**
   * Nullable means the primitive is for example not a "boolean" but a nullable "Boolean"
   */
  nullable?: boolean;
  valueConstant?: string | boolean | number;
}

type OmniEnumKnownKind = OmniTypeKind.ENUM;

export type OmniPrimitiveTypeKinds = OmniPrimitiveKind.INTEGER
  | OmniPrimitiveKind.INTEGER_SMALL
  | OmniPrimitiveKind.DOUBLE
  | OmniPrimitiveKind.FLOAT
  | OmniPrimitiveKind.DECIMAL
  | OmniPrimitiveKind.NUMBER;

export type AllowedEnumTsTypes = number | string;
export type AllowedEnumOmniPrimitiveTypes = OmniPrimitiveKind.STRING | OmniPrimitiveTypeKinds;

export interface OmniEnumType extends OmniBaseType<OmniEnumKnownKind> {
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
  schemaType: string;
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
