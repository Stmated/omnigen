import {AnyJSONSchema} from '../parse';
import {DocVisitorTransformer, DocVisitorUnknownTransformer, Entry, ToSingle} from './helpers';
import {ToDefined} from '@omnigen/core';
import {JSONSchema9} from '../definitions';

export interface JsonSchema9Visitor<S extends AnyJSONSchema = JSONSchema9> {

  visit_unknown: DocVisitorTransformer<DocVisitorUnknownTransformer<unknown>, this>;
  $defs: DocVisitorTransformer<S['$defs'], this>;
  $defs_option: DocVisitorTransformer<Entry<ToDefined<S['$defs']>[keyof ToDefined<S['$defs']>]>, this>;
  contentEncoding: DocVisitorTransformer<S['contentEncoding'], this>;
  contentMediaType: DocVisitorTransformer<S['contentMediaType'], this>;
  if: DocVisitorTransformer<S['if'], this>;
  then: DocVisitorTransformer<S['then'], this>;
  else: DocVisitorTransformer<S['else'], this>;
  readOnly: DocVisitorTransformer<S['readOnly'], this>;
  writeOnly: DocVisitorTransformer<S['writeOnly'], this>;
  $comment: DocVisitorTransformer<S['$comment'], this>;

  $id: DocVisitorTransformer<S['$id'], this>;
  const: DocVisitorTransformer<S['const'], this>;
  contains: DocVisitorTransformer<S['contains'], this>;
  propertyNames: DocVisitorTransformer<S['propertyNames'], this>;
  examples: DocVisitorTransformer<S['examples'], this>;
  schema: DocVisitorTransformer<Exclude<ToDefined<ToSingle<S['additionalItems']>>, boolean>, this>;
  schema_definition: DocVisitorTransformer<ToDefined<ToSingle<S['additionalItems']>>, this>;
  schema_boolean: DocVisitorTransformer<boolean, this>;
  schema_option: DocVisitorTransformer<ArrayItem<ToSingle<ToDefined<S['oneOf']>>>, this>;
  $schema: DocVisitorTransformer<S['$schema'], this>;
  jsonSchemaType: DocVisitorTransformer<ToDefined<S['const']>, this>;
  jsonSchemaTypeName: DocVisitorTransformer<ToDefined<ToSingle<S['type']>>, this>;
  definitions: DocVisitorTransformer<S['definitions'], this>;
  additionalItems: DocVisitorTransformer<S['additionalItems'], this>;
  additionalProperties: DocVisitorTransformer<S['additionalProperties'], this>;
  allOf: DocVisitorTransformer<S['allOf'], this>;
  anyOf: DocVisitorTransformer<S['anyOf'], this>;
  oneOf: DocVisitorTransformer<S['oneOf'], this>;
  not: DocVisitorTransformer<S['not'], this>;
  default: DocVisitorTransformer<S['default'], this>;
  dependentSchemas: DocVisitorTransformer<S['dependentSchemas'], this>;
  dependent_schema: DocVisitorTransformer<Entry<ToSingle<ToDefined<S['dependentSchemas']>>>, this>;
  dependentRequired: DocVisitorTransformer<S['dependentRequired'], this>;
  dependencies_strings: DocVisitorTransformer<string[], this>;
  description: DocVisitorTransformer<S['description'], this>;
  enum: DocVisitorTransformer<S['enum'], this>;
  enum_option: DocVisitorTransformer<ToSingle<ToDefined<S['enum']>>, this>;
  exclusiveMinimum: DocVisitorTransformer<S['exclusiveMinimum'], this>;
  exclusiveMaximum: DocVisitorTransformer<S['exclusiveMaximum'], this>;
  minimum: DocVisitorTransformer<S['minimum'], this>;
  maximum: DocVisitorTransformer<S['maximum'], this>;
  items: DocVisitorTransformer<S['items'], this>;
  items_item: DocVisitorTransformer<ToSingle<ToDefined<S['additionalItems']>>, this>;
  minItems: DocVisitorTransformer<S['minItems'], this>;
  maxItems: DocVisitorTransformer<S['maxItems'], this>;
  minLength: DocVisitorTransformer<S['minLength'], this>;
  maxLength: DocVisitorTransformer<S['maxLength'], this>;
  minProperties: DocVisitorTransformer<S['minProperties'], this>;
  maxProperties: DocVisitorTransformer<S['maxProperties'], this>;
  multipleOf: DocVisitorTransformer<S['multipleOf'], this>;
  pattern: DocVisitorTransformer<S['pattern'], this>;
  patternProperties: DocVisitorTransformer<S['patternProperties'], this>;
  properties: DocVisitorTransformer<S['properties'], this>;
  properties_option: DocVisitorTransformer<Entry<ToDefined<S['properties']>[keyof ToDefined<S['properties']>]>, this>;
  required: DocVisitorTransformer<S['required'], this>;
  required_option: DocVisitorTransformer<ToSingle<S['required']>, this>;
  title: DocVisitorTransformer<S['title'], this>;
  type: DocVisitorTransformer<S['type'], this>;
  format: DocVisitorTransformer<S['format'], this>;
  uniqueItems: DocVisitorTransformer<S['uniqueItems'], this>;
  $ref: DocVisitorTransformer<S['$ref'], this>;
  $dynamicRef: DocVisitorTransformer<S['$dynamicRef'], this>;
  $dynamicAnchor: DocVisitorTransformer<S['$dynamicAnchor'], this>;
}

//type JsonSchemaDefinitionArray<S extends AnyJSONSchema> = ToDefined<ToArray<ToDefined<S['const']>>>;
//type JsonSchemaDefinitionObject<S extends AnyJSONSchema> = Exclude<Extract<ToDefined<S['const']>, object>, Array<any>>;
//type JsonSchemaDefinitionPrimitive<S extends AnyJSONSchema> = Exclude<ToDefined<S['const']>, JsonSchemaDefinitionObject<S> | JsonSchemaDefinitionArray<S>>;

export type ArrayItem<T> = { idx: number, value: T };
