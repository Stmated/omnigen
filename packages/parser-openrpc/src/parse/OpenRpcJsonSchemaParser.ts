import {JsonSchemaParser} from '@omnigen/parser-jsonschema';
import {JsonObject} from 'json-pointer';
import {ParserOptions} from '@omnigen/core';

import {JSONSchema} from '@open-rpc/meta-schema';

export class OpenRpcJsonSchemaParser<TRoot extends JsonObject, TOpt extends ParserOptions> extends JsonSchemaParser<TRoot, TOpt> {

}
