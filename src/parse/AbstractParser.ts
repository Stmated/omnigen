import {Parser} from '@parse/Parser';
import {OmniModel} from '@parse';
import {SchemaFile} from '@parse/SchemaFile';

export abstract class AbstractParser implements Parser {
  abstract canHandle(schemaFile: SchemaFile): Promise<boolean>;
  abstract parse(schemaFile: SchemaFile): Promise<OmniModel>;
}
