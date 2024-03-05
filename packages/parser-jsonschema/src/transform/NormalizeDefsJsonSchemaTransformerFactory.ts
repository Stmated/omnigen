import {JsonSchema7Visitor} from '../visit/JsonSchema7Visitor.ts';
import {DefaultJsonSchema7Visitor} from '../visit/DefaultJsonSchema7Visitor.ts';
import {JsonSchema7VisitorFactory} from '../visit/JsonSchema7VisitorFactory.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

const visitor: JsonSchema7Visitor = {
  ...DefaultJsonSchema7Visitor,
  schema: (v, visitor) => {

    if (v.definitions && !v.$defs) {

      logger.debug(`Replacing definitions with non-existing $defs`);
      return DefaultJsonSchema7Visitor.schema({
        ...v,
        definitions: undefined,
        $defs: v.definitions,
      }, visitor);
    } else if (v.definitions && v.$defs) {

      const merged = {
        ...v.definitions,
        ...v.$defs,
      };

      logger.debug(`Replacing with $defs after merge`);
      return DefaultJsonSchema7Visitor.schema({
        ...v,
        definitions: undefined,
        $defs: merged,
      }, visitor);
    }

    return DefaultJsonSchema7Visitor.schema(v, visitor);
  },
  $ref: v => {
    return v;
  },
};

export class NormalizeDefsJsonSchemaTransformerFactory implements JsonSchema7VisitorFactory {

  create(): JsonSchema7Visitor {
    return visitor;
  }
}
