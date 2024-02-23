import {
  JSONSchema4,
  JSONSchema4Array,
  JSONSchema4Object,
  JSONSchema4Type,
  JSONSchema4TypeName, JSONSchema6,
  JSONSchema6Array, JSONSchema6Definition,
  JSONSchema6Object,
  JSONSchema6Type,
  JSONSchema6TypeName,
  JSONSchema7,
  JSONSchema7Array,
  JSONSchema7Definition,
  JSONSchema7Object,
  JSONSchema7Type,
  JSONSchema7TypeName,
} from 'json-schema';
import {AnyJsonDefinition, AnyJSONSchema} from '../parse';

export type ToSingle<T> = T extends Array<infer I> ? I : T;

export type AnyJsonSchemaType = JSONSchema7Type | JSONSchema6Type | JSONSchema4Type;
export type AnyJsonSchemaTypeName = JSONSchema7TypeName | JSONSchema6TypeName | JSONSchema4TypeName;
export type AnyJsonSchemaArray = JSONSchema7Array | JSONSchema6Array | JSONSchema4Array;
export type AnyJsonSchemaObject = JSONSchema7Object | JSONSchema6Object | JSONSchema4Object;

export type JsonSchema6Or7 = JSONSchema6 | JSONSchema7;

export type AnyJsonSchemaVisitor = JsonSchema4Visitor | JsonSchema6Visitor | JsonSchema7Visitor;

export type JsonSchema7Visitor = JsonSchema7Properties & JsonSchema6Properties<JSONSchema7> & JsonSchema7BaseVisitor;
export type JsonSchema6Visitor = JsonSchema6OnlyVisitor & JsonSchema6Properties<JSONSchema6> & JsonSchema6BaseVisitor;
export type JsonSchema4Visitor = JsonSchema4Properties & JsonSchema4BaseVisitor;

type JsonSchema7BaseVisitor = JsonSchemaBaseProperties<JSONSchema7, JSONSchema7Definition, JSONSchema7Type, JSONSchema7TypeName, JSONSchema7Array, JSONSchema7Object>;
type JsonSchema6BaseVisitor = JsonSchemaBaseProperties<JSONSchema6, JSONSchema6Definition, JSONSchema6Type, JSONSchema6TypeName, JSONSchema6Array, JSONSchema6Object>;
type JsonSchema4BaseVisitor = JsonSchemaBaseProperties<JSONSchema4, JSONSchema4, JSONSchema4Type, JSONSchema4TypeName, JSONSchema4Array, JSONSchema4Object>;

export interface JsonSchema7Properties<S extends JSONSchema7 = JSONSchema7> {
  $defs(v: S['$defs'], visitor: this): typeof v | undefined;
  contentEncoding(v: S['contentEncoding'], visitor: this): typeof v | undefined;
  contentMediaType(v: S['contentMediaType'], visitor: this): typeof v | undefined;
  if(v: S['if'], visitor: this): typeof v | undefined;
  then(v: S['then'], visitor: this): typeof v | undefined;
  else(v: S['else'], visitor: this): typeof v | undefined;
  readOnly(v: S['readOnly'], visitor: this): typeof v | undefined;
  writeOnly(v: S['writeOnly'], visitor: this): typeof v | undefined;
  $comment(v: S['$comment'], visitor: this): typeof v | undefined;
  examples(v: S['examples'], visitor: this): typeof v | undefined;
}

export interface JsonSchema6Properties<S extends JsonSchema6Or7 = JsonSchema6Or7> {
  $id(v: S['$id'], visitor: this): typeof v | undefined;
  const(v: S['const'], visitor: this): typeof v | undefined;
  contains(v: S['contains'], visitor: this): typeof v | undefined;
  propertyNames(v: S['propertyNames'], visitor: this): typeof v | undefined;
  required(v: S['required'], visitor: this): typeof v | undefined;
  required_option(v: ToSingle<S['required']>, visitor: this): typeof v | undefined;
}

export interface JsonSchema6OnlyVisitor {
  examples(v: JSONSchema6['examples'], visitor: this): typeof v | undefined;
}

export interface JsonSchema4Properties<S extends JSONSchema4 = JSONSchema4> {

  required(v: S['required'], visitor: this): typeof v | undefined;
  required_option(v: ToSingle<S['required']>, visitor: this): typeof v | undefined;
}

export interface JsonSchemaBaseProperties<
  S extends AnyJSONSchema = AnyJSONSchema,
  D extends AnyJsonDefinition = AnyJsonDefinition,
  T extends AnyJsonSchemaType = AnyJsonSchemaType,
  TN extends AnyJsonSchemaTypeName = AnyJsonSchemaTypeName,
  A extends AnyJsonSchemaArray = AnyJsonSchemaArray,
  O extends AnyJsonSchemaObject = AnyJsonSchemaObject
> {
  visit(v: D, visitor: this): typeof v | undefined;
  schema_boolean(v: boolean, visitor: this): typeof v | undefined;
  schema(v: S, visitor: this): typeof v | undefined;
  jsonSchemaType(v: T, visitor: this): typeof v | undefined;
  jsonSchemaArray(v: A, visitor: this): typeof v | undefined;
  jsonSchemaObject(v: O, visitor: this): typeof v | undefined;
  jsonSchemaTypePrimitive(v: Exclude<T, O | A>, visitor: this): typeof v | undefined;
  jsonSchemaTypeName(v: TN, visitor: this): typeof v | undefined;
  definitions(v: S['definitions'], visitor: this): typeof v | undefined;
  schemaVersion(v: S['$schema'], visitor: this): typeof v | undefined;
  additionalItems(v: S['additionalItems'], visitor: this): typeof v | undefined;
  additionalProperties(v: S['additionalProperties'], visitor: this): typeof v | undefined;
  allOf(v: S['allOf'], visitor: this): typeof v | undefined;
  anyOf(v: S['anyOf'], visitor: this): typeof v | undefined;
  oneOf(v: S['oneOf'], visitor: this): typeof v | undefined;
  not(v: S['not'], visitor: this): typeof v | undefined;
  default(v: S['default'], visitor: this): typeof v | undefined;
  dependencies(v: S['dependencies'], visitor: this): typeof v | undefined;
  dependencies_strings(v: string[], visitor: this): typeof v | undefined;
  description(v: S['description'], visitor: this): typeof v | undefined;
  enum(v: S['enum'], visitor: this): typeof v | undefined;
  enum_option(v: T, visitor: this): typeof v | undefined;
  exclusiveMinimum(v: S['exclusiveMinimum'], visitor: this): typeof v | undefined;
  exclusiveMaximum(v: S['exclusiveMaximum'], visitor: this): typeof v | undefined;
  minimum(v: S['minimum'], visitor: this): typeof v | undefined;
  maximum(v: S['maximum'], visitor: this): typeof v | undefined;
  minItems(v: S['minItems'], visitor: this): typeof v | undefined;
  maxItems(v: S['maxItems'], visitor: this): typeof v | undefined;
  minLength(v: S['minLength'], visitor: this): typeof v | undefined;
  maxLength(v: S['maxLength'], visitor: this): typeof v | undefined;
  minProperties(v: S['minProperties'], visitor: this): typeof v | undefined;
  maxProperties(v: S['maxProperties'], visitor: this): typeof v | undefined;
  multipleOf(v: S['multipleOf'], visitor: this): typeof v | undefined;
  pattern(v: S['pattern'], visitor: this): typeof v | undefined;
  patternProperties(v: S['patternProperties'], visitor: this): typeof v | undefined;
  properties(v: S['properties'], visitor: this): typeof v | undefined;
  title(v: S['title'], visitor: this): typeof v | undefined;
  type(v: S['type'], visitor: this): typeof v | undefined;
  type_array(v: Extract<S['type'], Array<any>>, visitor: this): typeof v | undefined;
  type_option(v: TN, visitor: this): typeof v | undefined;
  uniqueItems(v: S['uniqueItems'], visitor: this): typeof v | undefined;
  $ref(v: S['$ref'], visitor: this): typeof v | undefined;
}
