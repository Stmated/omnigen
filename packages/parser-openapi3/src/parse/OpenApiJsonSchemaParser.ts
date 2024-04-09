import {AnyJsonDefinition, AnyJSONSchema, JSONSchema9Definition, JsonSchemaParser, RefResolver} from '@omnigen/parser-jsonschema';
import {JsonObject} from 'json-pointer';
import {OmniModel, ParserOptions} from '@omnigen/core';
import {SchemaFile} from '@omnigen/core-util';

// TODO: This is the only one that should be able to handle 'discriminator' of JsonSchema -- move discriminator-related code into here

export class OpenApiJsonSchemaParser<TRoot extends JsonObject, TOpt extends ParserOptions> extends JsonSchemaParser<TRoot, TOpt> {

  private readonly _schemaFile: SchemaFile;

  constructor(refResolver: RefResolver, options: TOpt, schemaFile: SchemaFile) {
    super(refResolver, options);
    this._schemaFile = schemaFile;
  }

  public parse(root: AnyJSONSchema): OmniModel {

    // let root = await this._schemaFile.asObject<AnyJSONSchema>();
    root = JsonSchemaParser.preProcessJsonSchema(this._schemaFile.getAbsolutePath(), root);

    const model: OmniModel = {
      name: root.$id || '',
      version: '1.0',
      endpoints: [],
      servers: [],
      schemaVersion: root.$schema || '',
      schemaType: 'openapi',
      types: [],
    };

    const jsonSchemaParser = new JsonSchemaParser(this.refResolver, this._options);

    for (const schema of this.getAllSchemas(root)) {

      const s = schema[1];
      const resolved = this.refResolver.resolve(s);
      const omniTypeRes = jsonSchemaParser.jsonSchemaToType(schema[0], resolved);

      model.types.push(omniTypeRes.type);
    }

    return model;
  }

  private* getAllSchemas(schema: JSONSchema9Definition): Generator<[string | undefined, AnyJsonDefinition]> {

    if (typeof schema === 'boolean') {
      return;
    }

    if (schema.properties || schema.patternProperties || schema.type || schema.default !== undefined || (schema.type === undefined && schema.enum) || schema.format) {
      yield [undefined, schema];
    }

    if (schema.$defs) {
      for (const e of Object.entries(schema.$defs)) {
        yield e;
      }
    }

    if (schema.definitions) {
      for (const e of Object.entries(schema.definitions)) {
        yield e;
      }
    }
  }
}
