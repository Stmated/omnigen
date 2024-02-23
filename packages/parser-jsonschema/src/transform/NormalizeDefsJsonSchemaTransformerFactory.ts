import {JsonSchema7Visitor} from '../visit/JsonSchema7Visitor.ts';
import {DefaultJsonSchema7Visitor} from '../visit/DefaultJsonSchema7Visitor.ts';
import {JsonSchema7VisitorFactory} from '../visit/JsonSchema7VisitorFactory.ts';

const visitor: JsonSchema7Visitor = {
  ...DefaultJsonSchema7Visitor,
  schema: (v, visitor) => {

    if (v.definitions && !v.$defs) {
      return {
        ...v,
        definitions: undefined,
        $defs: v.definitions,
      };
    } else if (v.definitions && v.$defs) {

      const merged = {
        ...v.definitions,
        ...v.$defs,
      };

      return {
        ...v,
        definitions: undefined,
        $defs: merged,
      };
    }

    return DefaultJsonSchema7Visitor.schema(v, visitor);
  },
};

export class NormalizeDefsJsonSchemaTransformerFactory implements JsonSchema7VisitorFactory {

  create(): JsonSchema7Visitor {
    return visitor;
  }
}
