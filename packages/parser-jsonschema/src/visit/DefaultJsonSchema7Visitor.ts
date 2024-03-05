import {JsonSchema7Visitor} from './JsonSchema7Visitor.ts';
import {LoggerFactory} from '@omnigen/core-log';
import {JSONSchema7} from 'json-schema';
import {z} from 'zod';
import {DocVisitorTransformer, DocVisitorUnknownTransformer, safeSet, visitUniformArray, visitUniformObject} from './helpers.ts';

const logger = LoggerFactory.create(import.meta.url);

function createUnknownPropertiesHandler<S extends JSONSchema7>(): DocVisitorTransformer<DocVisitorUnknownTransformer<unknown>, JsonSchema7Visitor<S>> {

  return (v, visitor) => {
    const value = v.value;

    if (v.path[v.path.length - 1] == '$ref') {

      const transformed = visitor.$ref(z.coerce.string().parse(v.value), visitor);
      if (transformed === undefined) {
        return transformed;
      }
      return {...v, value: transformed};
    }

    if (value && Array.isArray(value)) {

      const transformedArray = visitUniformArray(value, (it, idx) => {

        const nextUnknown: DocVisitorUnknownTransformer<typeof it> = {
          path: [...v.path, `${idx}`],
          value: it,
        };

        return visitor.visit_unknown(nextUnknown, visitor)?.value;
      });

      if (transformedArray != v.value) {
        return {...v, value: transformedArray};
      }

    } else if (value && typeof value == 'object') {

      const transformedObject = visitUniformObject<any>(value, (it, key) => {
        const nextUnknown: DocVisitorUnknownTransformer<typeof it> = {
          path: [...v.path, key],
          value: it,
        };

        return visitor.visit_unknown(nextUnknown, visitor)?.value;
      });

      if (transformedObject != v.value) {
        return {...v, value: transformedObject};
      }
    }

    return v;
  };
}

export const DefaultJsonSchema7Visitor: JsonSchema7Visitor<JSONSchema7> = {
  visit: (v, visitor) => {
    if (typeof v == 'boolean') {
      return visitor.schema_boolean(v, visitor);
    } else {
      return visitor.schema(v, visitor);
    }
  },
  visit_unknown: createUnknownPropertiesHandler<JSONSchema7>(),
  schema: function(v, visitor) {

    const handled: string[] = [];

    // 6, order important, so that $id is handled before any $defs, definitions, oneOf, etc.
    safeSet(v, visitor, '$id', handled);
    safeSet(v, visitor, 'const', handled);
    safeSet(v, visitor, 'contains', handled);
    safeSet(v, visitor, 'examples', handled);
    safeSet(v, visitor, 'propertyNames', handled);

    // 7
    safeSet(v, visitor, '$defs', handled);
    safeSet(v, visitor, '$comment', handled);
    safeSet(v, visitor, 'contentEncoding', handled);
    safeSet(v, visitor, 'contentMediaType', handled);
    safeSet(v, visitor, 'if', handled);
    safeSet(v, visitor, 'then', handled);
    safeSet(v, visitor, 'else', handled);
    safeSet(v, visitor, 'readOnly', handled);
    safeSet(v, visitor, 'writeOnly', handled);

    // 4
    safeSet(v, visitor, '$ref', handled);
    safeSet(v, visitor, '$schema', handled);
    safeSet(v, visitor, 'definitions', handled);
    safeSet(v, visitor, 'additionalItems', handled);
    safeSet(v, visitor, 'additionalProperties', handled);
    safeSet(v, visitor, 'allOf', handled);
    safeSet(v, visitor, 'anyOf', handled);
    safeSet(v, visitor, 'oneOf', handled);
    safeSet(v, visitor, 'not', handled);
    safeSet(v, visitor, 'default', handled);
    safeSet(v, visitor, 'dependencies', handled);
    safeSet(v, visitor, 'description', handled);
    safeSet(v, visitor, 'enum', handled);
    safeSet(v, visitor, 'exclusiveMinimum', handled);
    safeSet(v, visitor, 'exclusiveMaximum', handled);
    safeSet(v, visitor, 'minimum', handled);
    safeSet(v, visitor, 'maximum', handled);
    safeSet(v, visitor, 'items', handled);
    safeSet(v, visitor, 'minItems', handled);
    safeSet(v, visitor, 'maxItems', handled);
    safeSet(v, visitor, 'minLength', handled);
    safeSet(v, visitor, 'maxLength', handled);
    safeSet(v, visitor, 'minProperties', handled);
    safeSet(v, visitor, 'maxProperties', handled);
    safeSet(v, visitor, 'multipleOf', handled);
    safeSet(v, visitor, 'pattern', handled);
    safeSet(v, visitor, 'patternProperties', handled);
    safeSet(v, visitor, 'properties', handled);
    safeSet(v, visitor, 'title', handled);
    safeSet(v, visitor, 'type', handled);
    safeSet(v, visitor, 'format', handled);
    safeSet(v, visitor, 'uniqueItems', handled);
    safeSet(v, visitor, 'required', handled);

    const keys = Object.keys(v);
    for (const unknownKey of keys) {
      if (handled.includes(unknownKey)) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(v, unknownKey)) {
        continue;
      }

      const unknownOwner = v as any;
      const unknownProperty: DocVisitorUnknownTransformer<unknown> = {
        // TODO: Would be much better if we had access to the full path here
        path: [unknownKey],
        value: unknownOwner[unknownKey] as unknown,
      };

      const handledUnknownProperty = visitor.visit_unknown(unknownProperty, visitor);

      if (handledUnknownProperty === undefined) {

        logger.trace(`Deleting unrecognized property ${unknownKey}`);
        delete unknownOwner[unknownKey];
      } else {

        logger.trace(`Moving over unrecognized JSONSchema property '${unknownKey}'`);
        unknownOwner[unknownKey] = handledUnknownProperty.value;
      }
    }

    // TODO: Include any unknown properties, ie. any vendor stuff

    return v;
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
  $schema: v => v,
  schema_option: (option, visitor) => {
    const res = visitor.visit(option.value, visitor);
    return res ? {idx: option.idx, value: res} : undefined;
  },
  jsonSchemaArray: (v, vi) => visitUniformArray(v, it => vi.jsonSchemaType(it, vi)),
  jsonSchemaObject: (v, visitor) => visitUniformObject(v, it => visitor.jsonSchemaType(it, visitor)),
  jsonSchemaTypePrimitive: v => v,
  jsonSchemaTypeName: v => v,
  additionalItems: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  additionalProperties: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  allOf: (v, visitor) => v ? visitUniformArray(v, (it, idx) => visitor.schema_option({idx, value: it}, visitor)?.value) : v,
  anyOf: (v, visitor) => v ? visitUniformArray(v, (it, idx) => visitor.schema_option({idx, value: it}, visitor)?.value) : v,
  oneOf: (v, visitor) => v ? visitUniformArray(v, (it, idx) => visitor.schema_option({idx, value: it}, visitor)?.value) : v,
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
  items: (v, visitor) => v ? Array.isArray(v) ? visitUniformArray(v, it => visitor.items_item(it, visitor)) : visitor.items_item(v, visitor) : v,
  items_item: (v, visitor) => typeof v == 'boolean' ? v : visitor.visit(v, visitor),
  minItems: v => v,
  maxItems: v => v,
  minLength: v => v,
  maxLength: v => v,
  minProperties: v => v,
  maxProperties: v => v,
  multipleOf: v => v,
  pattern: v => v,
  patternProperties: (v, visitor) => v ? visitUniformObject(v, it => visitor.visit(it, visitor)) : v,
  properties: (v, visitor) => v ? visitUniformObject(v, (it, k) => visitor.properties_option({key: k, value: it}, visitor)) : v,
  properties_option: (option, visitor) => {
    const res = visitor.visit(option.value, visitor);
    return res ? {key: option.key, value: res} : undefined;
  },
  title: v => v,
  type: (v, visitor) => Array.isArray(v) ? visitor.type_array(v, visitor) : v ? visitor.type_option(v, visitor) : v,
  type_array: (v, visitor) => v ? visitUniformArray(v, it => visitor.type_option(it, visitor)) : v,
  type_option: (v, visitor) => visitor.jsonSchemaTypeName(v, visitor),
  format: v => v,
  uniqueItems: v => v,
  $ref: v => v,

  definitions: (v, visitor) => v ? visitUniformObject(v, (it, k) => visitor.definitions_option({key: k, value: it}, visitor)) : v,
  $defs: (v, visitor) => v ? visitUniformObject(v, (it, k) => visitor.$defs_option({key: k, value: it}, visitor)) : v,

  definitions_option: (option, visitor) => {
    const res = visitor.visit(option.value, visitor);
    return res ? {key: option.key, value: res} : undefined;
  },
  $defs_option: (option, visitor) => {
    const res = visitor.visit(option.value, visitor);
    return res ? {key: option.key, value: res} : undefined;
  },

  $id: v => v,
  const: (v, visitor) => v ? visitor.jsonSchemaType(v, visitor) : v,
  contains: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  examples: (v, visitor) => v ? visitor.jsonSchemaType(v, visitor) : v,
  propertyNames: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  required: (v, visitor) => Array.isArray(v) ? visitUniformArray(v, it => visitor.required_option(it, visitor)) : v,
  required_option: v => v,

  $comment: v => v,
  contentEncoding: v => v,
  contentMediaType: v => v,
  readOnly: v => v,
  writeOnly: v => v,
  if: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  then: (v, visitor) => v ? visitor.visit(v, visitor) : v,
  else: (v, visitor) => v ? visitor.visit(v, visitor) : v,
};
