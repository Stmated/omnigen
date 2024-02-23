import {JsonSchema7VisitorFactory} from '../visit/JsonSchema7VisitorFactory.ts';
import {JsonSchema7Visitor} from '../visit/JsonSchema7Visitor.ts';
import {DefaultJsonSchema7Visitor} from '../visit/DefaultJsonSchema7Visitor.ts';

export class ApplyIdJsonSchemaTransformerFactory implements JsonSchema7VisitorFactory {

  create(): JsonSchema7Visitor {

    const idStack: string[] = [];
    const path: string[] = [];

    return {
      ...DefaultJsonSchema7Visitor,
      schema: (v, visitor) => {

        if (!v.$id) {

          return DefaultJsonSchema7Visitor.schema(v, visitor);

        } else {

          try {
            idStack.push(v.$id);
            return DefaultJsonSchema7Visitor.schema(v, visitor);
          } finally {
            idStack.pop();
          }
        }
      },
    };
  }
}
