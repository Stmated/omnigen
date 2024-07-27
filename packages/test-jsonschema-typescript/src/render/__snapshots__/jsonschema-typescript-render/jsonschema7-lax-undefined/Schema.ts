export interface SchemaPatternProperties {
  readonly [key: string]: Schema | undefined;
}

export type ArrayableSchema = Schema | readonly [Schema, ...ReadonlyArray<Schema>];
export type Schema = SchemaObject | boolean;

export interface SchemaDefinitions {
  readonly [key: string]: Schema | undefined;
}

export interface SchemaDependencies {
  readonly [key: string]: SchemaDependenciesAdditional | undefined;
}

export type SchemaDependenciesAdditional = Schema | ReadonlyArray<string>;

export interface SchemaProperties {
  readonly [key: string]: Schema | undefined;
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
  readonly $comment?: string | undefined;
  readonly $id?: string | undefined;
  readonly $ref?: string | undefined;
  readonly $schema?: string | undefined;
  readonly additionalItems?: Schema | undefined;
  readonly additionalProperties?: Schema | undefined;
  readonly allOf?: readonly [Schema, ...ReadonlyArray<Schema>] | undefined;
  readonly anyOf?: readonly [Schema, ...ReadonlyArray<Schema>] | undefined;
  readonly const?: any;
  readonly contains?: Schema | undefined;
  readonly contentEncoding?: string | undefined;
  readonly contentMediaType?: string | undefined;
  readonly default?: any;
  readonly definitions?: SchemaDefinitions | undefined;
  readonly dependencies?: SchemaDependencies | undefined;
  readonly description?: string | undefined;
  readonly else?: Schema | undefined;
  readonly enum?: readonly [any, ...ReadonlyArray<any>] | undefined;
  readonly examples?: ReadonlyArray<any> | undefined;
  readonly exclusiveMaximum?: number | undefined;
  readonly exclusiveMinimum?: number | undefined;
  readonly format?: string | undefined;
  readonly if?: Schema | undefined;
  readonly items?: ArrayableSchema | undefined;
  readonly maximum?: number | undefined;
  readonly maxItems?: number | undefined;
  readonly maxLength?: number | undefined;
  readonly maxProperties?: number | undefined;
  readonly minimum?: number | undefined;
  readonly minItems?: number | undefined;
  readonly minLength?: number | undefined;
  readonly minProperties?: number | undefined;
  readonly multipleOf?: number | undefined;
  readonly not?: Schema | undefined;
  readonly oneOf?: readonly [Schema, ...ReadonlyArray<Schema>] | undefined;
  readonly pattern?: string | undefined;
  readonly patternProperties?: SchemaPatternProperties | undefined;
  readonly properties?: SchemaProperties | undefined;
  readonly propertyNames?: Schema | undefined;
  readonly readOnly?: boolean | undefined;
  readonly required?: ReadonlyArray<string> | undefined;
  readonly then?: Schema | undefined;
  readonly title?: string | undefined;
  readonly type?: SchemaType | undefined;
  readonly uniqueItems?: boolean | undefined;
  readonly writeOnly?: boolean | undefined;
}
