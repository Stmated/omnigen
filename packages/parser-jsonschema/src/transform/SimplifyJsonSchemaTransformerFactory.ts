import {JsonSchema9Visitor} from '../visit';
import {JsonSchema9VisitorFactory} from '../visit/JsonSchema9VisitorFactory';
import {JSONSchema9} from '../definitions';

export class SimplifyJsonSchemaTransformerFactory<S extends JSONSchema9, V extends JsonSchema9Visitor<S>> implements JsonSchema9VisitorFactory<S, V> {

  private readonly _baseVisitor: V;

  constructor(baseVisitor: V) {
    this._baseVisitor = baseVisitor
  }

  create(): V {
    return {
      ...this._baseVisitor,
      schema: (v, visitor) => {

        if (v.oneOf && v.oneOf.length == 1) {

          // Weird way of writing the schema, but if it's just 1 then it's same as "allOf"
          if (v.allOf) {
            v.allOf.push(v.oneOf[0]);
          } else {
            v.allOf = v.oneOf;
          }

          delete v.oneOf;
          //v.oneOf = undefined;
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

        return this._baseVisitor.schema(v, visitor);
      },
    };
  }
}
