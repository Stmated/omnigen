import {AnyJSONSchema} from './JsonSchemaParser.ts';

export class JsonSchemaUtil {

  public static simplifyComposition<T extends AnyJSONSchema>(schema: T): T {

    return schema;
  }
}
