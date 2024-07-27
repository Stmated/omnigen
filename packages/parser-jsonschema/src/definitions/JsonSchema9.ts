
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

export type JSONSchema9Definition =
  | JSONSchema9
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
  $defs?: Record<string, JSONSchema9Definition>;
  definitions?: Record<string, JSONSchema9Definition>;
  $comment?: string;

  $dynamicRef?: string;
  $dynamicAnchor?: string;

  if?: JSONSchema9Definition;
  then?: JSONSchema9Definition;
  else?: JSONSchema9Definition;
  allOf?: Array<JSONSchema9Definition>;
  anyOf?: Array<JSONSchema9Definition>;
  oneOf?: Array<JSONSchema9Definition> | undefined;
  not?: JSONSchema9Definition;
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

  properties?: Record<string, JSONSchema9Definition>;
  patternProperties?: Record<string, JSONSchema9Definition>;
  additionalProperties?: JSONSchema9Definition;
  unevaluatedProperties?: JSONSchema9Definition;
  propertyNames?: JSONSchema9Definition;
  dependentSchemas?: Record<string, JSONSchema9Definition>;

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

  items?:
    | JSONSchema9Definition
    | Array<JSONSchema9Definition>;

  additionalItems?: JSONSchema9Definition;
  unevaluatedItems?: JSONSchema9Definition;
  contains?: JSONSchema9Definition;
}

type DefinedEncoding =
  | '7bit'
  | '8bit'
  | 'binary'
  | 'quoted-printable'
  | 'base16'
  | 'base32'
  | 'base64';
