import {JsonSchemaParser} from '@omnigen/parser-jsonschema';
import {JsonObject} from 'json-pointer';
import {ParserOptions} from '@omnigen/api';

export class OpenRpcJsonSchemaParser<TRoot extends JsonObject, TOpt extends ParserOptions> extends JsonSchemaParser<TRoot, TOpt> {

}
