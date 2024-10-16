import {JsonSchema9Visitor} from '../visit/JsonSchema9Visitor';
import {DefaultJsonSchema9Visitor} from '../visit/DefaultJsonSchema9Visitor';
import {JsonSchema9VisitorFactory} from '../visit/JsonSchema9VisitorFactory';

const visitor: JsonSchema9Visitor = {
  ...DefaultJsonSchema9Visitor,
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

    // if (v.enum && v.enum.length == 1) {
    //
    //   if (v.const !== undefined && v.const != v.enum[0]) {
    //     throw new Error(`Cannot have a one-item enum and const set at the same time unless they are equal`);
    //   } else {
    //     v.const = v.enum[0];
    //     delete v.enum;
    //   }
    // }

    return DefaultJsonSchema9Visitor.schema(v, visitor);
  },
};

export class SimplifyJsonSchemaTransformerFactory implements JsonSchema9VisitorFactory {

  create(): JsonSchema9Visitor {
    return visitor;
  }
}
