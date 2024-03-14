import {JsonSchema7Visitor} from '../visit/JsonSchema7Visitor.ts';
import {DefaultJsonSchema7Visitor} from '../visit/DefaultJsonSchema7Visitor.ts';
import {JsonSchema7VisitorFactory} from '../visit/JsonSchema7VisitorFactory.ts';

const visitor: JsonSchema7Visitor = {
  ...DefaultJsonSchema7Visitor,
  schema: (v, visitor) => {

    if (v.oneOf && v.oneOf.length == 1) {

      // Weird way of writing the schema, but if it's just 1 then it's same as "allOf"
      if (v.allOf) {
        v.allOf.push(v.oneOf[0]);
      } else {
        v.allOf = v.oneOf;
      }

      v.oneOf = undefined;
    }

    if (v.enum && v.enum.length == 1) {

      if (v.const !== undefined && v.const != v.enum[0]) {
        throw new Error(`Cannot have a one-item enum and const set at the same time unless they are equal`);
      } else {
        v.const = v.enum[0];
        delete v.enum;
      }
    }

    return DefaultJsonSchema7Visitor.schema(v, visitor);
  },
};

export class SimplifyJsonSchemaTransformerFactory implements JsonSchema7VisitorFactory {

  create(): JsonSchema7Visitor {
    return visitor;
  }
}
