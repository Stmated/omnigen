import {JsonSchema7Visitor, ToSingle} from './JsonSchema7Visitor.ts';

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

  visit: (v, visitor) => {

    if (typeof v == 'boolean') {
      return v;
    }

    v.definitions = visitor.visit_definitions(v.definitions, visitor);
    v.$defs = visitor.visit_definitions(v.$defs, visitor);
    v.$comment = visitor.visit_comment(v.$comment, visitor);
    v.$id = visitor.visit_schemaId(v.$id, visitor);
    v.$ref = visitor.visit_ref(v.$ref, visitor);
    v.$schema = visitor.visit_schemaVersion(v.$schema, visitor);
    v.additionalItems = visitor.visit_additionalItems(v.additionalItems, visitor);
    v.additionalProperties = visitor.visit_additionalProperties(v.additionalProperties, visitor);
    v.allOf = visitor.visit_allOf(v.allOf, visitor);
    v.anyOf = visitor.visit_anyOf(v.anyOf, visitor);
    v.oneOf = visitor.visit_oneOf(v.oneOf, visitor);
    v.not = visitor.visit_not(v.not, visitor);
    v.const = visitor.visit_const(v.const, visitor);
    v.contains = visitor.visit_contains(v.contains, visitor);
    v.contentEncoding = visitor.visit_contentEncoding(v.contentEncoding, visitor);
    v.contentMediaType = visitor.visit_contentMediaType(v.contentMediaType, visitor);
    v.default = visitor.visit_default(v.default, visitor);
    v.dependencies = visitor.visit_dependencies(v.dependencies, visitor);
    v.description = visitor.visit_description(v.description, visitor);
    v.enum = visitor.visit_enum(v.enum, visitor);
    v.examples = visitor.visit_examples(v.examples, visitor);
    v.exclusiveMinimum = visitor.visit_exclusiveMinimum(v.exclusiveMinimum, visitor);
    v.exclusiveMaximum = visitor.visit_exclusiveMaximum(v.exclusiveMaximum, visitor);
    v.minimum = visitor.visit_minimum(v.minimum, visitor);
    v.maximum = visitor.visit_maximum(v.maximum, visitor);
    v.minItems = visitor.visit_minItems(v.minItems, visitor);
    v.maxItems = visitor.visit_maxItems(v.maxItems, visitor);
    v.minLength = visitor.visit_minLength(v.minLength, visitor);
    v.maxLength = visitor.visit_maxLength(v.maxLength, visitor);
    v.minProperties = visitor.visit_minProperties(v.minProperties, visitor);
    v.maxProperties = visitor.visit_maxProperties(v.maxProperties, visitor);
    v.multipleOf = visitor.visit_multipleOf(v.multipleOf, visitor);
    v.pattern = visitor.visit_pattern(v.pattern, visitor);
    v.patternProperties = visitor.visit_patternProperties(v.patternProperties, visitor);
    v.properties = visitor.visit_properties(v.properties, visitor);
    v.propertyNames = visitor.visit_propertyNames(v.propertyNames, visitor);
    v.required = visitor.visit_required(v.required, visitor);
    v.if = visitor.visit_if(v.if, visitor);
    v.then = visitor.visit_then(v.then, visitor);
    v.else = visitor.visit_else(v.else, visitor);
    v.title = visitor.visit_title(v.title, visitor);
    v.type = visitor.visit_type(v.type, visitor);
    v.uniqueItems = visitor.visit_uniqueItems(v.uniqueItems, visitor);
    v.readOnly = visitor.visit_readOnly(v.readOnly, visitor);
    v.writeOnly = visitor.visit_writeOnly(v.writeOnly, visitor);

    // TODO: Include any unknown properties, ie. any vendor stuff

    return v;
  },
  visit_jsonSchemaType: (v, vi) => {

    if (Array.isArray(v)) {
      return vi.visit_jsonSchemaArray(v, vi);
    } else if (v && typeof v == 'object') {
      return vi.visit_jsonSchemaObject(v, vi);
    }

    return vi.visit_jsonSchemaTypePrimitive(v, vi);
  },
  visit_jsonSchemaArray: (v, vi) => visitUniformArray(v, it => vi.visit_jsonSchemaType(it, vi)),
  visit_jsonSchemaObject: (v, visitor) => visitUniformObject(v, it => visitor.visit_jsonSchemaType(it, visitor)),
  visit_jsonSchemaTypePrimitive: v => v,
  visit_jsonSchemaTypeName: v => v,
  visit_definitions: (v, visitor) => v ? visitUniformObject(v, it => visitor.visit(it, visitor)) : v,
  visit_schemaVersion: v => v,
  visit_schemaId: v => v,
  visit_additionalItems: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  visit_additionalProperties: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  visit_allOf: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit(it, visitor)) : v,
  visit_anyOf: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit(it, visitor)) : v,
  visit_oneOf: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit(it, visitor)) : v,
  visit_not: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  visit_const: (v, visitor) => v ? visitor.visit_jsonSchemaType(v, visitor) : v,
  visit_contains: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  visit_contentEncoding: v => v,
  visit_contentMediaType: v => v,
  visit_default: (v, visitor) => v ? visitor.visit_jsonSchemaType(v, visitor) : v,
  visit_dependencies: (v, visitor) => v ? visitUniformObject(v, it => Array.isArray(it) ? visitor.visit_dependencies_strings(it, visitor) : visitor.visit(it, visitor)) : v,
  visit_dependencies_strings: v => v,
  visit_description: v => v,
  visit_enum: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit_enum_option(it, visitor)) : v,
  visit_enum_option: (v, visitor) => visitor.visit_jsonSchemaType(v, visitor),
  visit_examples: (v, visitor) => v ? visitor.visit_jsonSchemaType(v, visitor) : v,
  visit_exclusiveMinimum: v => v,
  visit_exclusiveMaximum: v => v,
  visit_minimum: v => v,
  visit_maximum: v => v,
  visit_minItems: v => v,
  visit_maxItems: v => v,
  visit_minLength: v => v,
  visit_maxLength: v => v,
  visit_minProperties: v => v,
  visit_maxProperties: v => v,
  visit_multipleOf: v => v,
  visit_pattern: v => v,
  visit_patternProperties: (v, visitor) => v ? visitUniformObject(v, it => visitor.visit(it, visitor)) : v,
  visit_properties: (v, visitor) => v ? visitUniformObject(v, it => visitor.visit(it, visitor)) : v,
  visit_propertyNames: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  visit_required: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit_required_option(it, visitor)) : v,
  visit_required_option: v => v,
  visit_if: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  visit_then: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  visit_else: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  visit_title: v => v,
  visit_type: (v, visitor) => Array.isArray(v) ? visitor.visit_type_array(v, visitor) : v ? visitor.visit_type_option(v, visitor) : v,
  visit_type_array: (v, visitor) => v ? visitUniformArray(v, it => visitor.visit_type_option(it, visitor)) : v,
  visit_type_option: (v, visitor) => visitor.visit_jsonSchemaTypeName(v, visitor),
  visit_uniqueItems: v => v,
  visit_readOnly: v => v,
  visit_writeOnly: v => v,
  visit_comment: v => v,
  visit_ref: v => v,
};
