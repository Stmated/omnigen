export interface Schema {
  readonly $comment?: string;
  readonly $id?: string;
  readonly $ref?: string;
  readonly $schema?: string;
  readonly additionalItems?: Schema;
  readonly additionalProperties?: Schema;
  readonly allOf?: readonly [Schema, ...ReadonlyArray<Schema>];
  readonly anyOf?: readonly [Schema, ...ReadonlyArray<Schema>];
  readonly const?: any;
  readonly contains?: Schema;
  readonly contentEncoding?: string;
  readonly contentMediaType?: string;
  readonly default?: any;
  readonly definitions?: SchemaDefinitions;
  readonly dependencies?: SchemaDependencies;
  readonly description?: string;
  readonly else?: Schema;
  readonly enum?: readonly [any, ...ReadonlyArray<any>];
  readonly examples?: ReadonlyArray<any>;
  readonly exclusiveMaximum?: number;
  readonly exclusiveMinimum?: number;
  readonly format?: string;
  readonly if?: Schema;
  readonly items?: SchemaItems;
  readonly maximum?: number;
  readonly maxItems?: number;
  readonly maxLength?: number;
  readonly maxProperties?: number;
  readonly minimum?: number;
  readonly minItems?: number;
  readonly minLength?: number;
  readonly minProperties?: number;
  readonly multipleOf?: number;
  readonly not?: Schema;
  readonly oneOf?: readonly [Schema, ...ReadonlyArray<Schema>];
  readonly pattern?: string;
  readonly patternProperties?: SchemaPatternProperties;
  readonly properties?: SchemaProperties;
  readonly propertyNames?: Schema;
  readonly readOnly?: boolean;
  readonly required?: ReadonlyArray<string>;
  readonly then?: Schema;
  readonly title?: string;
  readonly type?: SchemaType;
  readonly uniqueItems?: boolean;
  readonly writeOnly?: boolean;
}

export interface SchemaDefinitions {
  readonly [key: string /* Pattern: ".*" */]: Schema;
}

export interface SchemaDependencies {
  readonly [key: string /* Pattern: ".*" */]: SchemaDependenciesSchema;
}

export type SchemaDependenciesSchema = Schema | ReadonlyArray<string>;
export type SchemaItems = Schema | readonly [Schema, ...ReadonlyArray<Schema>];
export interface SchemaPatternProperties {
  readonly [key: string /* Pattern: ".*" */]: Schema;
}

export interface SchemaProperties {
  readonly [key: string /* Pattern: ".*" */]: Schema;
}

export type SchemaType = SimpleTypes | readonly [SimpleTypes, ...ReadonlyArray<SimpleTypes>];
export enum SimpleTypes {
  ARRAY = 'array',
  BOOLEAN = 'boolean',
  INTEGER = 'integer',
  NULL = 'null',
  NUMBER = 'number',
  OBJECT = 'object',
  STRING = 'string',
}
