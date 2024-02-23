import {JsonSchemaParser} from '@omnigen/parser-jsonschema';
import {JsonObject} from 'json-pointer';
import {ParserOptions} from '@omnigen/core';

// TODO: This is the only one that should be able to handle 'discriminator' of JsonSchema -- move discriminator-related code into here

export class OpenApiJsonSchemaParser<TRoot extends JsonObject, TOpt extends ParserOptions> extends JsonSchemaParser<TRoot, TOpt> {

}
