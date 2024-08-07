export interface SchemaPatternProperties {
  readonly [key: string]: Schema;
}

export type ArrayableSchema = Schema | readonly [Schema, ...ReadonlyArray<Schema>];
export type Schema = SchemaObject | boolean;

export interface SchemaDefinitions {
  readonly [key: string]: Schema;
}

export interface SchemaDependencies {
  readonly [key: string]: SchemaDependenciesAdditional;
}

export type SchemaDependenciesAdditional = Schema | ReadonlyArray<string>;

export interface SchemaProperties {
  readonly [key: string]: Schema;
}

export enum SimpleTypes {
  ARRAY = 'array',
  BOOLEAN = 'boolean',
  INTEGER = 'integer',
  NULL = 'null',
  NUMBER = 'number',
  OBJECT = 'object',
  STRING = 'string',
}

export type SchemaType = SimpleTypes | readonly [SimpleTypes, ...ReadonlyArray<SimpleTypes>];

export interface SchemaObject {
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
  readonly items?: ArrayableSchema;
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
