import {
  ApplyIdJsonSchemaTransformerFactory,
  createDefaultJsonSchema9Visitor,
  DocVisitorTransformer,
  Entry,
  JSONSchema9,
  JSONSchema9Definition,
  JsonSchema9Visitor,
  JsonSchemaParser,
  RefResolver, safeSet2,
  visitUniformObject,
} from '@omnigen/parser-jsonschema';
import {OmniItemKind, OmniModel, ParserOptions, ToDefined} from '@omnigen/api';
import {SchemaFile} from '@omnigen/core';
import {OpenAPIV3, OpenAPIV3_1} from 'openapi-types';
import {DocumentStore} from '@omnigen/core-json';
import HttpMethods = OpenAPIV3.HttpMethods;

type ValueOf<T> = T[keyof T];

interface OpenApiVisitorOnly<T extends {} = {}, S extends OpenAPIV3_1.Document<T> = OpenAPIV3_1.Document<T>> {
  openapi_document: DocVisitorTransformer<S, this>;

  openapi_schema: DocVisitorTransformer<OpenAPIV3_1.SchemaObject, this>;

  openapi_paths: DocVisitorTransformer<ToDefined<S['paths']>, this>;
  openapi_paths_option: DocVisitorTransformer<Entry<ValueOf<ToDefined<S['paths']>>>, this>;
  openapi_path_operation: DocVisitorTransformer<OpenAPIV3_1.OperationObject<T>, this>;

  openapi_discriminator: DocVisitorTransformer<OpenAPIV3_1.DiscriminatorObject, this>;
  openapi_xml: DocVisitorTransformer<OpenAPIV3_1.XMLObject, this>;
  openapi_externalDocs: DocVisitorTransformer<OpenAPIV3_1.ExternalDocumentationObject, this>;

  openapi_components: DocVisitorTransformer<OpenAPIV3_1.ComponentsObject, this>;

  openapi_schemas: DocVisitorTransformer<ToDefined<OpenAPIV3_1.ComponentsObject['schemas']>, this>;
  openapi_schemas_option: DocVisitorTransformer<Entry<OpenAPIV3_1.SchemaObject>, this>;
  // schema: DocVisitorTransformer<OpenAPIV3_1.SchemaObject, this>;

  openapi_parameters: DocVisitorTransformer<ToDefined<OpenAPIV3_1.ComponentsObject['parameters']>, this>;
  openapi_parameters_option: DocVisitorTransformer<Entry<ValueOf<ToDefined<OpenAPIV3_1.ComponentsObject['parameters']>>>, this>;

  openapi_callbacks: DocVisitorTransformer<ToDefined<OpenAPIV3_1.ComponentsObject['callbacks']>, this>;
  openapi_callbacks_option: DocVisitorTransformer<Entry<ValueOf<ToDefined<OpenAPIV3_1.ComponentsObject['callbacks']>>>, this>;

  openapi_pathItems: DocVisitorTransformer<ToDefined<OpenAPIV3_1.ComponentsObject['pathItems']>, this>;
  openapi_pathItems_option: DocVisitorTransformer<Entry<ValueOf<ToDefined<OpenAPIV3_1.ComponentsObject['pathItems']>>>, this>;

  openapi_requestBodies: DocVisitorTransformer<ToDefined<OpenAPIV3_1.ComponentsObject['requestBodies']>, this>;
  openapi_requestBodies_option: DocVisitorTransformer<Entry<ValueOf<ToDefined<OpenAPIV3_1.ComponentsObject['requestBodies']>>>, this>;

  openapi_responses: DocVisitorTransformer<ToDefined<OpenAPIV3_1.ComponentsObject['responses']>, this>;
  openapi_responses_option: DocVisitorTransformer<Entry<ValueOf<ToDefined<OpenAPIV3_1.ComponentsObject['responses']>>>, this>;
}

export interface OpenApiVisitor<S extends OpenAPIV3_1.Document> extends OpenApiVisitorOnly<S>, JsonSchema9Visitor {

}

const jsonSchemaVisitor = createDefaultJsonSchema9Visitor();
const openapi_jsonSchemaVisitor = (jsonSchemaVisitor as unknown as Omit<OpenApiVisitor<OpenAPIV3_1.Document>, keyof OpenApiVisitorOnly<OpenAPIV3_1.Document>>);
export const DefaultOpenApiVisitor: OpenApiVisitor<OpenAPIV3_1.Document> = {
  ...openapi_jsonSchemaVisitor,
  // schema: (v, visitor) => {
  //
  //   return visitor.openapi_schema(v as OpenAPIV3_1.SchemaObject, visitor) as JSONSchema9 | undefined;
  // },
  openapi_schema: (v, visitor) => {

    // Visit the schema using the JSON Schema visitor, with out current visitor as override so we keep in OpenApi context.
    // TODO: This is not a pretty solution/cast, but should work for now.
    const altered_jsonschema = visitor.schema(v as JSONSchema9, visitor); // as unknown as JsonSchema9Visitor);

    // And then we will handle any OpenAPI-specific properties here.
    if (altered_jsonschema) {

      const altered = altered_jsonschema as OpenAPIV3_1.SchemaObject;

      safeSet2(altered, visitor, 'discriminator', 'openapi_discriminator');
      safeSet2(altered, visitor, 'xml', 'openapi_xml');
      safeSet2(altered, visitor, 'externalDocs', 'openapi_externalDocs');

      return altered;
    }

    return undefined;
  },
  openapi_document: (v, visitor) => {

    safeSet2(v, visitor, 'paths', 'openapi_paths');
    safeSet2(v, visitor, 'components', 'openapi_components');

    return v;
  },
  openapi_discriminator: (v, visitor) => {
    return v;
  },
  openapi_xml: (v, visitor) => {
    return v;
  },
  openapi_externalDocs: (v, visitor) => {
    return v;
  },
  openapi_components: (v, visitor) => {

    safeSet2(v, visitor, 'schemas', 'openapi_schemas');
    safeSet2(v, visitor, 'parameters', 'openapi_parameters');
    safeSet2(v, visitor, 'callbacks', 'openapi_callbacks');
    safeSet2(v, visitor, 'pathItems', 'openapi_pathItems');
    safeSet2(v, visitor, 'requestBodies', 'openapi_requestBodies');
    safeSet2(v, visitor, 'responses', 'openapi_responses');

    return v;
  },
  openapi_schemas: (v, visitor) => {
    return visitUniformObject(v, (it, k) => visitor.openapi_schemas_option({key: k, value: it}, visitor))
  },
  openapi_schemas_option: (v, visitor) => {

    const transformed = visitor.openapi_schema(v.value, visitor);
    if (!transformed) {
      return undefined;
    }

    return {key: v.key, value: transformed};
  },
  openapi_parameters: (v, visitor) => {
    return visitUniformObject(v, (it, k) => visitor.openapi_parameters_option({key: k, value: it}, visitor));
  },
  openapi_parameters_option: (v, visitor) => {
    return v;
  },
  openapi_paths: (v, visitor) => {
    return visitUniformObject(v, (it, k) => visitor.openapi_paths_option({key: k, value: it}, visitor));
  },
  openapi_paths_option: (v, visitor) => {

    if (v.value) {

      safeSet2(v.value, visitor, HttpMethods.POST, 'openapi_path_operation');
      safeSet2(v.value, visitor, HttpMethods.GET, 'openapi_path_operation');
      safeSet2(v.value, visitor, HttpMethods.PUT, 'openapi_path_operation');
      safeSet2(v.value, visitor, HttpMethods.OPTIONS, 'openapi_path_operation');
      safeSet2(v.value, visitor, HttpMethods.DELETE, 'openapi_path_operation');
      safeSet2(v.value, visitor, HttpMethods.HEAD, 'openapi_path_operation');
      safeSet2(v.value, visitor, HttpMethods.PATCH, 'openapi_path_operation');
      safeSet2(v.value, visitor, HttpMethods.TRACE, 'openapi_path_operation');

      safeSet2(v.value, visitor, 'parameters', 'openapi_parameters');
    }

    return v;
  },
  openapi_path_operation: (v, visitor) => {

    // tags?: string[];
    // summary?: string;
    // description?: string;
    // externalDocs?: ExternalDocumentationObject;
    // operationId?: string;
    // parameters?: (ReferenceObject | ParameterObject)[];
    // requestBody?: ReferenceObject | RequestBodyObject;
    // responses: ResponsesObject;
    // callbacks?: {
    //     [callback: string]: ReferenceObject | CallbackObject;
    // };
    // deprecated?: boolean;
    // security?: SecurityRequirementObject[];
    // servers?: ServerObject[];
    // parameters?: (ReferenceObject | ParameterObject)[];
    // requestBody?: ReferenceObject | RequestBodyObject;
    // responses?: ResponsesObject;
    // callbacks?: Record<string, ReferenceObject | CallbackObject>;
    // servers?: ServerObject[];

    return v;
  },

  openapi_callbacks: (v, visitor) => {
    return v;
  },
  openapi_pathItems: (v, visitor) => {
    return v;
  },
  openapi_requestBodies: (v, visitor) => {
    return v;
  },
  openapi_responses: (v, visitor) => {
    return v;
  },
  openapi_callbacks_option: (v, visitor) => {
    return v;
  },
  openapi_pathItems_option: (v, visitor) => {
    return v;
  },
  openapi_requestBodies_option: (v, visitor) => {
    return v;
  },
  openapi_responses_option: (v, visitor) => {
    return v;
  },
}

export class OpenApiJsonSchemaParser<TOpt extends ParserOptions> extends JsonSchemaParser<TOpt> {

  private readonly _schemaFile: SchemaFile;
  private readonly _docStore = new DocumentStore();

  constructor(refResolver: RefResolver, options: TOpt, schemaFile: SchemaFile) {
    super(refResolver, options);
    this._schemaFile = schemaFile;
  }

  public parse(root: OpenAPIV3_1.Document): OmniModel {

    const applyIdTransformerFactory = new ApplyIdJsonSchemaTransformerFactory(DefaultOpenApiVisitor);
    const applyIdTransformer = applyIdTransformerFactory.create();
    const alteredApplyIdTransformer: OpenApiVisitor<OpenAPIV3_1.Document> = {
      ...applyIdTransformer,
      openapi_schemas_option: (v, visitor) => {
        try {
          applyIdTransformerFactory.pushPath(v.key);
          return applyIdTransformer.openapi_schemas_option(v, visitor);
        } finally {
          applyIdTransformerFactory.popPath();
        }
      },
    };

    // TODO: We should have a way to add paths to the ApplyId transformer inside the pre-processing, so the types get proper/better context for names
    root = JsonSchemaParser.preProcessSchema(this._schemaFile.getAbsolutePath(), DefaultOpenApiVisitor, root, 'openapi_document', this._docStore,

      // TODO: Make sure we add the proper context stuff here
      alteredApplyIdTransformer,
    );

    const model: OmniModel = {
      kind: OmniItemKind.MODEL,
      name: root.info.title || '',
      version: root.info.version,
      endpoints: [],
      servers: [],
      schemaVersion: root.info.version || '',
      schemaType: 'openapi',
      types: [],
    };

    for (const [schemaKey, schema] of this.getAllSchemas(root)) {
      model.types.push(this.jsonSchemaToType(schema, {key: schemaKey}).type);
    }

    return model;
  }

  private* getAllSchemas<S extends JSONSchema9>(document: OpenAPIV3_1.Document): Generator<[string | undefined, JSONSchema9Definition<S>]> {

    if (document.components?.schemas) {
      for (const [schemaKey, schema] of Object.entries(document.components?.schemas)) {
        yield [schemaKey, schema as JSONSchema9Definition<S>];
      }
    }
  }
}
