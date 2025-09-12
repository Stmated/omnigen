import {Arrayable} from '@omnigen/api';

/**
 * Primitive type
 * @see {@link https://tools.ietf.org/html/draft-handrews-json-schema-validation-02#section-6.1.1}
 */
export type JSONSchema9TypeName =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export type JSONSchema9Type =
  | JSONSchema9Type[]
  | boolean
  | number
  | null
  | JSONSchema9Object
  | string;

export interface JSONSchema9Object {
  [key: string]: JSONSchema9Type;
}

export type JSONSchema9Version = string;

export type JSONSchema9Definition<S extends JSONSchema9 = JSONSchema9> =
  | S
  | boolean;

export type JSONSchema9DefinedFormat =
  | 'date-time'
  | 'date'
  | 'time'
  | 'duration'
  | 'email'
  | 'idn-email'
  | 'hostname'
  | 'idn-hostname'
  | 'ipv4'
  | 'ipv6'
  | 'uri'
  | 'uri-reference'
  | 'iri'
  | 'iri-reference'
  | 'uuid'
  | 'uri-template'
  | 'json-pointer'
  | 'relative-json-pointer'
  | 'regex';

export interface JSONSchema9 {
  type?: JSONSchema9TypeName | JSONSchema9TypeName[];
  $id?: string;
  $anchor?: string;
  $ref?: string;
  $recursiveRef?: '#';
  $recursiveAnchor?: boolean;
  $schema?: JSONSchema9Version;
  $vocabulary?: Record<string, boolean>;
  $defs?: Record<string, JSONSchema9Definition<this>>;
  definitions?: Record<string, JSONSchema9Definition<this>>;
  $comment?: string;

  $dynamicRef?: string;
  $dynamicAnchor?: string;

  if?: JSONSchema9Definition<this>;
  then?: JSONSchema9Definition<this>;
  else?: JSONSchema9Definition<this>;
  allOf?: Array<JSONSchema9Definition<this>>;
  anyOf?: Array<JSONSchema9Definition<this>>;
  oneOf?: Array<JSONSchema9Definition<this>>;
  not?: JSONSchema9Definition<this>;
  format?: JSONSchema9DefinedFormat | string;
  title?: string;
  description?: string;
  default?: JSONSchema9Type;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: JSONSchema9Type[];

  enum?: JSONSchema9Type[];
  const?: JSONSchema9Type;

  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  dependentRequired?: Record<string, string[]>;

  properties?: Record<string, JSONSchema9Definition<this>>;
  patternProperties?: Record<string, JSONSchema9Definition<this>>;
  additionalProperties?: JSONSchema9Definition<this>;
  unevaluatedProperties?: JSONSchema9Definition<this>;
  propertyNames?: JSONSchema9Definition<this>;
  dependentSchemas?: Record<string, JSONSchema9Definition<this>>;

  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  maxLength?: number;
  minLength?: number;
  pattern?: string;
  contentEncoding?: DefinedEncoding;
  contentMediaType?: string;
  contentSchema?: JSONSchema9;

  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxContains?: number;

  items?: Arrayable<JSONSchema9Definition<this>>;

  additionalItems?: JSONSchema9Definition<this>;
  unevaluatedItems?: JSONSchema9Definition<this>;
  contains?: JSONSchema9Definition<this>;
}

type DefinedEncoding =
  | '7bit'
  | '8bit'
  | 'binary'
  | 'quoted-printable'
  | 'base16'
  | 'base32'
  | 'base64';
