import {JSONSchema9Definition, JSONSchema9, JsonSchemaParser, RefResolver} from '@omnigen/parser-jsonschema';
import {OmniItemKind, OmniModel, ParserOptions} from '@omnigen/api';
import {SchemaFile} from '@omnigen/core';
import {OpenAPIV3_1 as OpenApi3} from 'openapi-types';
import {DocumentStore} from '@omnigen/core-json';

// TODO: This is the only one that should be able to handle 'discriminator' of JsonSchema -- move discriminator-related code into here

export class OpenApiJsonSchemaParser<TOpt extends ParserOptions> extends JsonSchemaParser<TOpt> {

  private readonly _schemaFile: SchemaFile;
  private readonly _docStore = new DocumentStore()

  constructor(refResolver: RefResolver, options: TOpt, schemaFile: SchemaFile) {
    super(refResolver, options);
    this._schemaFile = schemaFile;
  }

  public parse(root: JSONSchema9): OmniModel {

    // NOTE: This is wrong and will very likely not work, since there is very little overlap. Would need to create a new type of visitor.
    root = JsonSchemaParser.preProcessJsonSchema(this._schemaFile.getAbsolutePath(), root, this._docStore);

    const openApiDocument = root as OpenApi3.Document;

    const model: OmniModel = {
      kind: OmniItemKind.MODEL,
      name: openApiDocument.info.title || root.$id || '',
      version: openApiDocument.info.version,
      endpoints: [],
      servers: [],
      schemaVersion: root.$schema || '',
      schemaType: 'openapi',
      types: [],
    };

    for (const [schemaKey, schema] of this.getAllSchemas(openApiDocument)) {

      const resolved = this.refResolver.resolve(schema);
      const omniTypeRes = this.jsonSchemaToType(schemaKey, resolved);

      model.types.push(omniTypeRes.type);
    }

    return model;
  }

  private* getAllSchemas(document: OpenApi3.Document): Generator<[string | undefined, JSONSchema9Definition]> {

    if (document.components?.schemas) {
      for (const [schemaKey, schema] of Object.entries(document.components?.schemas)) {
        yield [schemaKey, schema as JSONSchema9Definition];
      }
    }
  }
}
