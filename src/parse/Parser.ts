import {GenericModel} from '@parse';
import {SchemaFile} from '@parse/SchemaFile';

export interface Parser {

  canHandle(schemaFile: SchemaFile): Promise<boolean>;

  parse(schemaFile: SchemaFile): Promise<GenericModel>;
}
