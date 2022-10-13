import {JSONSchema4, JSONSchema6, JSONSchema7} from 'json-schema';
import {IDiscriminatorAware} from '@omnigen/parser-jsonschema';

// TODO: Move these types into a more JsonSchema-centric place, and rename to something else?
export type OpenApiJSONSchema4 = JSONSchema4 & IDiscriminatorAware;
export type OpenApiJSONSchema6 = JSONSchema6 & IDiscriminatorAware;
export type OpenApiJSONSchema7 = JSONSchema7 & IDiscriminatorAware;

export type OpenApiJSONSchema4Definition = OpenApiJSONSchema4 | boolean;
export type OpenApiJSONSchema6Definition = OpenApiJSONSchema6 | boolean;
export type OpenApiJSONSchema7Definition = OpenApiJSONSchema7 | boolean;
