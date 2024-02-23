import {AnyJsonSchemaVisitor, JsonSchema7Visitor, ToSingle} from './JsonSchema7Visitor.ts';

function visitUniformObject<T>(obj: T, mapper: { (child: T[keyof T]): typeof child | undefined }): T {

  const newObj: Partial<T> = {};
  let changeCount = 0;
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }

    const res = mapper(obj[key]);
    if (res && res != obj[key]) {
      changeCount++;
      // @ts-ignore
      newObj[key] = res;
    } else if (!res) {
      changeCount++;
    }
  }

  return ((changeCount > 0) ? newObj as T : obj);
}

function visitUniformArray<A extends Array<any>>(array: A, mapper: { (item: ToSingle<A>): ToSingle<A> | undefined }): A {

  const newArr: Array<ToSingle<A>> = [];
  let changeCount = 0;
  for (let i = 0; i < array.length; i++) {
    const item = array[i];

    const res = mapper(item);
    if (res && res != item) {
      changeCount++;
      newArr[i] = res;
    } else if (!res) {
      changeCount++;
    }
  }

  return ((changeCount > 0) ? newArr as A : array);
}

export const DefaultJsonSchema7Visitor: JsonSchema7Visitor = {
  schema: (v, visitor) => {

    v.$ref = visitor.$ref(v.$ref, visitor);
    v.$schema = visitor.schemaVersion(v.$schema, visitor);
    v.definitions = visitor.definitions(v.definitions, visitor);
    v.additionalItems = visitor.additionalItems(v.additionalItems, visitor);
    v.additionalProperties = visitor.additionalProperties(v.additionalProperties, visitor);
    v.allOf = visitor.allOf(v.allOf, visitor);
    v.anyOf = visitor.anyOf(v.anyOf, visitor);
    v.oneOf = visitor.oneOf(v.oneOf, visitor);
    v.not = visitor.not(v.not, visitor);
    v.default = visitor.default(v.default, visitor);
    v.dependencies = visitor.dependencies(v.dependencies, visitor);
    v.description = visitor.description(v.description, visitor);
    v.enum = visitor.enum(v.enum, visitor);
    v.exclusiveMinimum = visitor.exclusiveMinimum(v.exclusiveMinimum, visitor);
    v.exclusiveMaximum = visitor.exclusiveMaximum(v.exclusiveMaximum, visitor);
    v.minimum = visitor.minimum(v.minimum, visitor);
    v.maximum = visitor.maximum(v.maximum, visitor);
    v.minItems = visitor.minItems(v.minItems, visitor);
    v.maxItems = visitor.maxItems(v.maxItems, visitor);
    v.minLength = visitor.minLength(v.minLength, visitor);
    v.maxLength = visitor.maxLength(v.maxLength, visitor);
    v.minProperties = visitor.minProperties(v.minProperties, visitor);
    v.maxProperties = visitor.maxProperties(v.maxProperties, visitor);
    v.multipleOf = visitor.multipleOf(v.multipleOf, visitor);
    v.pattern = visitor.pattern(v.pattern, visitor);
    v.patternProperties = visitor.patternProperties(v.patternProperties, visitor);
    v.properties = visitor.properties(v.properties, visitor);
    v.title = visitor.title(v.title, visitor);
    v.type = visitor.type(v.type, visitor);
    v.uniqueItems = visitor.uniqueItems(v.uniqueItems, visitor);

    v.$id = visitor.$id(v.$id, visitor);
    v.const = visitor.const(v.const, visitor);
    v.contains = visitor.contains(v.contains, visitor);
    v.examples = visitor.examples(v.examples, visitor);
    v.propertyNames = visitor.propertyNames(v.propertyNames, visitor);

    v.$defs = visitor.$defs(v.$defs, visitor);
    v.$comment = visitor.$comment(v.$comment, visitor);
    v.contentEncoding = visitor.contentEncoding(v.contentEncoding, visitor);
    v.contentMediaType = visitor.contentMediaType(v.contentMediaType, visitor);
    v.if = visitor.if(v.if, visitor);
    v.then = visitor.then(v.then, visitor);
    v.else = visitor.else(v.else, visitor);
    v.readOnly = visitor.readOnly(v.readOnly, visitor);
    v.writeOnly = visitor.writeOnly(v.writeOnly, visitor);

    // TODO: Include any unknown properties, ie. any vendor stuff

    return v;
  },

  visit: (v, visitor) => {
    if (typeof v == 'boolean') {
      return visitor.schema_boolean(v, visitor);
    } else {
      return visitor.schema(v, visitor);
    }
  },
  schema_boolean: v => v,
  jsonSchemaType: (v, vi) => {

    if (Array.isArray(v)) {
      return vi.jsonSchemaArray(v, vi);
    } else if (v && typeof v == 'object') {
      return vi.jsonSchemaObject(v, vi);
    }

    return vi.jsonSchemaTypePrimitive(v, vi);
  },
  jsonSchemaArray: (v, vi) => visitUniformArray(v, it => vi.jsonSchemaType(it, vi)),
  jsonSchemaObject: (v, visitor) => visitUniformObject(v, it => visitor.jsonSchemaType(it, visitor)),
  jsonSchemaTypePrimitive: v => v,
  jsonSchemaTypeName: v => v,
  definitions: (v, visitor) => v ? visitUniformObject(v, it => visitor.visit(it, visitor)) : v,
  schemaVersion: v => v,
  additionalItems: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  additionalProperties: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  allOf: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit(it, visitor)) : v,
  anyOf: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit(it, visitor)) : v,
  oneOf: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit(it, visitor)) : v,
  not: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  default: (v, visitor) => v ? visitor.jsonSchemaType(v, visitor) : v,
  dependencies: (v, visitor) => v ? visitUniformObject(v, it => Array.isArray(it) ? visitor.dependencies_strings(it, visitor) : visitor.visit(it, visitor)) : v,
  dependencies_strings: v => v,
  description: v => v,
  enum: (v, visitor) => v ? visitUniformArray(v, it => visitor.enum_option(it, visitor)) : v,
  enum_option: (v, visitor) => visitor.jsonSchemaType(v, visitor),
  exclusiveMinimum: v => v,
  exclusiveMaximum: v => v,
  minimum: v => v,
  maximum: v => v,
  minItems: v => v,
  maxItems: v => v,
  minLength: v => v,
  maxLength: v => v,
  minProperties: v => v,
  maxProperties: v => v,
  multipleOf: v => v,
  pattern: v => v,
  patternProperties: (v, visitor) => v ? visitUniformObject(v, it => visitor.visit(it, visitor)) : v,
  properties: (v, visitor) => v ? visitUniformObject(v, it => visitor.visit(it, visitor)) : v,
  title: v => v,
  type: (v, visitor) => Array.isArray(v) ? visitor.type_array(v, visitor) : v ? visitor.type_option(v, visitor) : v,
  type_array: (v, visitor) => v ? visitUniformArray(v, it => visitor.type_option(it, visitor)) : v,
  type_option: (v, visitor) => visitor.jsonSchemaTypeName(v, visitor),
  uniqueItems: v => v,
  $ref: v => v,

  $id: v => v,
  const: (v, visitor) => v ? visitor.jsonSchemaType(v, visitor) : v,
  contains: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  examples: (v, visitor) => v ? visitor.jsonSchemaType(v, visitor) : v,
  propertyNames: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  required: (v, visitor) => Array.isArray(v) ? visitUniformArray(v, it => visitor.required_option(it, visitor)) : v,
  required_option: v => v,

  $defs: (v, visitor) => visitor.definitions(v, visitor),
  $comment: v => v,
  contentEncoding: v => v,
  contentMediaType: v => v,
  readOnly: v => v,
  writeOnly: v => v,
  if: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  then: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  else: (v, visitor) => v ? visitor.visit(v, visitor) : v,
};
