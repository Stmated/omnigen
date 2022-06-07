import {Parser} from '@parse/Parser';
import {GenericModel} from '@model';
import {SchemaFile} from '@parse/SchemaFile';

export abstract class AbstractParser implements Parser {
  abstract canHandle(schemaFile: SchemaFile): Promise<boolean>;
  abstract parse(schemaFile: SchemaFile): Promise<GenericModel>;
}
