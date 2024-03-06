import {TypeName} from './TypeName';
import {OmniTypeKind} from './OmniTypeKind.ts';
import {OmniPrimitiveKind} from './OmniPrimitiveKind.ts';

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

export enum OmniArrayKind {
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
  /**
   * TODO: REMOVE! It is ugly and should not really be needed...
   */
  owner: OmniPropertyOwner;

  description?: string | undefined;
  summary?: string | undefined;
  /**
   * TODO: Is this supposed to be a modifier? And have all the booleans as modifiers that can easily be added to
   */
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
  /**
   * TODO: Is this supposed to be a modifier?
   */
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
  | OmniCompositionAndType<OmniSuperTypeCapableType>
  | OmniCompositionOrType<OmniSuperTypeCapableType>
  | OmniCompositionXorType<OmniSuperTypeCapableType>
  | OmniCompositionNotType<OmniSuperTypeCapableType>
  | OmniExternalModelReferenceType<OmniSuperTypeCapableType> // Needs to be unwrapped/resolved every time
  | OmniDecoratingType<OmniSuperTypeCapableType>
  | OmniPrimitiveNonNullableType
  ;

export type OmniSuperGenericTypeCapableType = OmniObjectType
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
  | OmniCompositionAndType
  | OmniCompositionOrType
  | OmniCompositionXorType
  | OmniCompositionNotType
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
   * The name is not necessarily unique. There might be many types with the same name.
   * Generally, only the OmniClassType is generally more certain to be unique.
   *
   * TODO: Make this into a possibility of being an array as well, and remove "nameClassifier"
   *        Maybe remake TypeName so that the array is lazily calculated, to decrease load
   */
  name: TypeName;
}

export type OmniOptionallyNamedType = Partial<OmniNamedType>;

export interface OmniTypeWithInnerType<T extends OmniType | OmniType[] = OmniType> {
  of: T;
}

export interface OmniBaseType<T extends OmniTypeKind> {

  kind: T;
  /**
   * TODO: Implement! REMOVE the optional and make it required! ALL types MUST have an absolute uri, to make it possible to merge types between schemas/contracts
   */
  absoluteUri?: string | undefined;
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

export interface OmniCompositionTypeBase<T extends OmniType, K extends CompositionKind> extends OmniBaseType<typeof OmniTypeKind.COMPOSITION>, OmniOptionallyNamedType {
  compositionKind: K;
  types: T[];
}

export interface OmniCompositionAndType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, CompositionKind.AND> {}
export interface OmniCompositionOrType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, CompositionKind.OR> {}
export interface OmniCompositionXorType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, CompositionKind.XOR> {}
export interface OmniCompositionNotType<T extends OmniType = OmniType> extends OmniCompositionTypeBase<T, CompositionKind.NOT> {}

export type OmniCompositionType<T extends OmniType = OmniType, CK extends CompositionKind = CompositionKind> = Extract<
  OmniCompositionAndType<T>
  | OmniCompositionOrType<T>
  | OmniCompositionXorType<T>
  | OmniCompositionNotType<T>
  , {compositionKind: CK}>
  ;


export interface OmniDictionaryType<K extends OmniType = OmniType, V extends OmniType = OmniType> extends OmniBaseType<'DICTIONARY'> {
  keyType: K;
  valueType: V;
}


export interface OmniHardcodedReferenceType extends OmniBaseType<'HARDCODED_REFERENCE'> {
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
  WILDCARD: 'WILDCARD',
} as const;
export type UnknownKind = (typeof UnknownKind)[keyof typeof UnknownKind];

export interface OmniUnknownType extends OmniBaseType<'UNKNOWN'> {
  valueDefault?: OmniPrimitiveConstantValue | null;
  unknownKind?: UnknownKind,
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

  /**
   * In difference to JsonSchema, this needs to be specifically `true` to enable additional properties
   */
  additionalProperties?: boolean | undefined;
}

export type OmniPrimitiveConstantValue = string | boolean | number

export interface OmniPrimitiveBaseType extends OmniBaseType<'PRIMITIVE'>, OmniOptionallyNamedType {

  name?: TypeName;
  primitiveKind: OmniPrimitiveKind;
  nullable?: boolean;
  value?: OmniPrimitiveConstantValue | null | undefined;
  /**
   * Undefined = OmniPrimitiveValueMode.DEFAULT
   */
  literal?: boolean;
}

export interface OmniPrimitiveNullType extends OmniPrimitiveBaseType {
  primitiveKind: typeof OmniPrimitiveKind.NULL;
  nullable?: true;
  value?: null;
  literal?: true;
}

export interface OmniPrimitiveVoidType extends OmniPrimitiveBaseType {
  primitiveKind: typeof OmniPrimitiveKind.VOID;
  nullable?: true;
  value?: undefined;
  literal?: true;
}

export type OmniPrimitiveTangibleKind = Exclude<OmniPrimitiveKind, typeof OmniPrimitiveKind.NULL | typeof OmniPrimitiveKind.VOID>;

export interface OmniPrimitiveTangibleNullableType extends OmniPrimitiveBaseType {
  primitiveKind: OmniPrimitiveTangibleKind;
  nullable: true;
  value?: OmniPrimitiveConstantValue | null;
  literal?: boolean;
}

export interface OmniPrimitiveNonNullableType extends OmniPrimitiveBaseType {
  primitiveKind: OmniPrimitiveTangibleKind;
  nullable?: false,
  value?: OmniPrimitiveConstantValue;
  literal?: boolean;
}

export type OmniPrimitiveNullableType =
  OmniPrimitiveTangibleNullableType
  | OmniPrimitiveNullType
  | OmniPrimitiveVoidType;

export type OmniPrimitiveType =
  OmniPrimitiveVoidType
  | OmniPrimitiveNullType
  | OmniPrimitiveNullableType
  | OmniPrimitiveNonNullableType;

export type AllowedEnumTsTypes = number | string;
export type OmniAllowedEnumPrimitiveKinds = typeof OmniPrimitiveKind.STRING
  | typeof OmniPrimitiveKind.INTEGER
  | typeof OmniPrimitiveKind.INTEGER_SMALL
  | typeof OmniPrimitiveKind.DOUBLE
  | typeof OmniPrimitiveKind.FLOAT
  | typeof OmniPrimitiveKind.DECIMAL
  | typeof OmniPrimitiveKind.NUMBER;

export interface OmniEnumType extends OmniBaseType<typeof OmniTypeKind.ENUM>, OmniNamedType {
  enumConstants?: AllowedEnumTsTypes[];
  enumNames?: string[];
  primitiveKind: OmniAllowedEnumPrimitiveKinds;
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

