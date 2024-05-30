export interface _20221007 extends SpecificationExtensions, Schema20221007 {
  readonly components?: Components | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly info: Info;
  readonly jsonSchemaDialect?: string | undefined;
  readonly openapi: string;
  readonly paths?: Paths | undefined;
  readonly security?: ReadonlyArray<SecurityRequirement> | undefined;
  readonly servers?: ReadonlyArray<Server> | undefined;
  readonly tags?: ReadonlyArray<Tag> | undefined;
  readonly webhooks?: _20221007Webhooks | undefined;
}

export interface _20221007Webhooks {
  readonly [key: string]: CallbacksAdditionalProperties | undefined;
}

export interface AuthorizationCode extends SpecificationExtensions {
  readonly authorizationUrl: string;
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
}

export interface Callbacks extends SpecificationExtensions {
  readonly [key: string]: CallbacksAdditionalProperties | undefined;
}

export type CallbacksAdditionalProperties = Reference | PathItem;
export interface ClientCredentials extends SpecificationExtensions {
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
}

export interface Components extends SpecificationExtensions {
  readonly callbacks?: ComponentsCallbacks | undefined;
  readonly examples?: ComponentsExamples | undefined;
  readonly headers?: ComponentsHeaders | undefined;
  readonly links?: ComponentsLinks | undefined;
  readonly parameters?: ComponentsParameters | undefined;
  readonly pathItems?: ComponentsPathItems | undefined;
  readonly requestBodies?: ComponentsRequestBodies | undefined;
  readonly responses?: ComponentsResponses | undefined;
  readonly schemas?: ComponentsSchemas | undefined;
  readonly securitySchemes?: ComponentsSecuritySchemes | undefined;
  readonly [key: string /* Pattern: "^(schemas|responses|parameters|examples|requestBodies|headers|securitySchemes|links|callbacks|pathItems)$" */]: ComponentsSchema | undefined;
}

export interface ComponentsCallbacks {
  readonly [key: string]: OperationCallbacksAdditionalProperties | undefined;
}

export interface ComponentsExamples {
  readonly [key: string]: ExamplesExamplesAdditionalProperties | undefined;
}

export interface ComponentsHeaders {
  readonly [key: string]: EncodingHeadersAdditionalProperties | undefined;
}

export interface ComponentsLinks {
  readonly [key: string]: ResponseLinksAdditionalProperties | undefined;
}

export interface ComponentsParameters {
  readonly [key: string]: ParameterOrReference | undefined;
}

export interface ComponentsPathItems {
  readonly [key: string]: CallbacksAdditionalProperties | undefined;
}

export interface ComponentsRequestBodies {
  readonly [key: string]: RequestBodyOrReference | undefined;
}

export interface ComponentsResponses {
  readonly [key: string]: ResponseOrReference | undefined;
}

export type ComponentsSchema = object;
export interface ComponentsSchemas {
  readonly [key: string]: ComponentsSchemasAdditionalProperties | undefined;
}

export type ComponentsSchemasAdditionalProperties = object;
export interface ComponentsSecuritySchemes {
  readonly [key: string]: ComponentsSecuritySchemesAdditionalProperties | undefined;
}

export type ComponentsSecuritySchemesAdditionalProperties = Reference | SecurityScheme;
export interface Contact extends SpecificationExtensions {
  readonly email?: string | undefined;
  readonly name?: string | undefined;
  readonly url?: string | undefined;
}

export interface Content {
  readonly [key: string]: ContentAdditionalProperties | undefined;
}

export interface ContentAdditionalProperties extends Examples, SpecificationExtensions {

}

export interface EncodingHeaders {
  readonly [key: string]: EncodingHeadersAdditionalProperties | undefined;
}

export type EncodingHeadersAdditionalProperties = Reference | Header;
export enum EncodingStyle {
  FORM = 'form',
  SPACE_DELIMITED = 'spaceDelimited',
  PIPE_DELIMITED = 'pipeDelimited',
  DEEP_OBJECT = 'deepObject',
}

export interface Example extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly externalValue?: string | undefined;
  readonly summary?: string | undefined;
  readonly value?: any;
}

export interface Examples {
  readonly encoding?: MediaTypeEncoding | undefined;
  readonly example?: any;
  readonly examples?: ExamplesExamples | undefined;
  readonly schema?: MediaTypeSchema | undefined;
}

export type ExampleSchema = object;
export interface ExamplesExamples {
  readonly [key: string]: ExamplesExamplesAdditionalProperties | undefined;
}

export type ExamplesExamplesAdditionalProperties = Reference | Example;
export interface ExternalDocumentation extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly url: string;
}

export interface Header extends HeaderSchema, SpecificationExtensions {
  readonly content?: HeaderContent | undefined;
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  readonly required?: boolean | undefined;
  readonly schema?: HeaderSchemaSchema | undefined;
}

export type HeaderContent = Content;
export type HeaderSchema = object;
export type HeaderSchemaSchema = object;
export interface Implicit extends SpecificationExtensions {
  readonly authorizationUrl: string;
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
}

export interface Info extends SpecificationExtensions {
  readonly contact?: Contact | undefined;
  readonly description?: string | undefined;
  readonly license?: License | undefined;
  readonly summary?: string | undefined;
  readonly termsOfService?: string | undefined;
  readonly title: string;
  readonly version: string;
}

export interface License extends SpecificationExtensions {
  readonly identifier?: string | undefined;
  readonly name: string;
  readonly url?: string | undefined;
}

export interface Link extends LinkSchema, SpecificationExtensions {
  readonly body?: Server | undefined;
  readonly description?: string | undefined;
  readonly operationId?: string | undefined;
  readonly operationRef?: string | undefined;
  readonly parameters?: MapOfStrings | undefined;
  readonly requestBody?: any;
}

export type LinkSchema = object;
export interface MapOfStrings {
  readonly [key: string]: string | undefined;
}

export interface MediaTypeEncoding {
  readonly [key: string]: MediaTypeEncodingAdditionalProperties | undefined;
}

export interface MediaTypeEncodingAdditionalProperties extends SpecificationExtensions {
  readonly allowReserved?: boolean | undefined;
  readonly contentType?: string | undefined;
  readonly explode?: boolean | undefined;
  readonly headers?: EncodingHeaders | undefined;
  readonly style?: EncodingStyle | undefined;
}

export type MediaTypeSchema = object;
export interface OauthFlows extends SpecificationExtensions {
  readonly authorizationCode?: AuthorizationCode | undefined;
  readonly clientCredentials?: ClientCredentials | undefined;
  readonly implicit?: Implicit | undefined;
  readonly password?: Password | undefined;
}

export interface Operation extends SpecificationExtensions {
  readonly callbacks?: OperationCallbacks | undefined;
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly operationId?: string | undefined;
  readonly parameters?: ReadonlyArray<ParameterOrReference> | undefined;
  readonly requestBody?: RequestBodyOrReference | undefined;
  readonly responses?: Responses | undefined;
  readonly security?: ReadonlyArray<SecurityRequirement> | undefined;
  readonly servers?: ReadonlyArray<Server> | undefined;
  readonly summary?: string | undefined;
  readonly tags?: ReadonlyArray<string> | undefined;
}

export interface OperationCallbacks {
  readonly [key: string]: OperationCallbacksAdditionalProperties | undefined;
}

export type OperationCallbacksAdditionalProperties = Reference | Callbacks;
export interface Parameter extends SpecificationExtensions, ParameterSchema, ParameterThen {

}

export type ParameterContent = Content;
export enum ParameterInSchema {
  QUERY = 'query',
  HEADER = 'header',
  PATH = 'path',
  COOKIE = 'cookie',
}

export type ParameterOrReference = Reference | Parameter;
export type ParameterSchema = object;
export type ParameterSchemaSchema = object;
export interface ParameterThen {
  readonly allowEmptyValue?: boolean | undefined;
  readonly content?: ParameterContent | undefined;
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  readonly in: ParameterInSchema;
  readonly name: string;
  readonly required?: boolean | undefined;
  readonly schema?: ParameterSchemaSchema | undefined;
}

export interface Password extends SpecificationExtensions {
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
}

export interface PathItem extends SpecificationExtensions {
  readonly delete?: Operation | undefined;
  readonly description?: string | undefined;
  readonly get?: Operation | undefined;
  readonly head?: Operation | undefined;
  readonly options?: Operation | undefined;
  readonly parameters?: ReadonlyArray<ParameterOrReference> | undefined;
  readonly patch?: Operation | undefined;
  readonly post?: Operation | undefined;
  readonly put?: Operation | undefined;
  readonly servers?: ReadonlyArray<Server> | undefined;
  readonly summary?: string | undefined;
  readonly trace?: Operation | undefined;
}

export interface Paths extends SpecificationExtensions {
  readonly [key: string /* Pattern: "^\/" */]: PathItem | undefined;
}

export interface Reference {
  readonly $ref?: string | undefined;
  readonly description?: string | undefined;
  readonly summary?: string | undefined;
}

export interface RequestBody extends SpecificationExtensions {
  readonly content: Content;
  readonly description?: string | undefined;
  readonly required?: boolean | undefined;
}

export type RequestBodyOrReference = Reference | RequestBody;
export interface Response extends SpecificationExtensions {
  readonly content?: Content | undefined;
  readonly description: string;
  readonly headers?: ResponseHeaders | undefined;
  readonly links?: ResponseLinks | undefined;
}

export interface ResponseHeaders {
  readonly [key: string]: EncodingHeadersAdditionalProperties | undefined;
}

export interface ResponseLinks {
  readonly [key: string]: ResponseLinksAdditionalProperties | undefined;
}

export type ResponseLinksAdditionalProperties = Reference | Link;
export type ResponseOrReference = Reference | Response;
export interface Responses extends SpecificationExtensions, ResponsesThen {
  readonly [key: string /* Pattern: "^[1-5](?:[0-9]{2}|XX)$" */]: ResponseOrReference | undefined;
}

export interface ResponsesThen {
  readonly default?: ResponseOrReference | undefined;
}

export type Schema = object;
export type Schema20221007 = object;
export interface SecurityRequirement {
  readonly [key: string]: ReadonlyArray<string> | undefined;
}

export interface SecurityScheme extends TypeApikey, TypeHttp, TypeHttpBearer, TypeOauth2, TypeOidc, SpecificationExtensions {

}

export enum SecuritySchemeType {
  API_KEY = 'apiKey',
  HTTP = 'http',
  MUTUAL_TLS = 'mutualTLS',
  OAUTH2 = 'oauth2',
  OPEN_ID_CONNECT = 'openIdConnect',
}

export interface Server extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly url: string;
  readonly variables?: ServerVariables | undefined;
}

export interface ServerVariables {
  readonly [key: string]: ServerVariablesAdditionalProperties | undefined;
}

export interface ServerVariablesAdditionalProperties extends SpecificationExtensions {
  readonly default: string;
  readonly description?: string | undefined;
  readonly enum?: readonly [string, ...ReadonlyArray<string>] | undefined;
}

export interface SpecificationExtensions {
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type StylesForForm = StylesForFormThen | StylesForFormElse;
export interface StylesForFormElse {
  readonly explode?: boolean | undefined;
}

export interface StylesForFormThen {
  readonly explode?: boolean | undefined;
}

export interface Tag extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly name: string;
}

export type TypeApikey = TypeApikeyThen;
export enum TypeApikeyIn {
  QUERY = 'query',
  HEADER = 'header',
  COOKIE = 'cookie',
}

export interface TypeApikeyThen {
  readonly description?: string | undefined;
  readonly in: TypeApikeyIn;
  readonly name: string;
  readonly type: SecuritySchemeType;
}

export type TypeHttp = TypeHttpThen;
export type TypeHttpBearer = TypeHttpBearerThen;
export interface TypeHttpBearerThen {
  readonly bearerFormat?: string | undefined;
}

export interface TypeHttpThen {
  readonly scheme: string;
}

export type TypeOauth2 = TypeOauth2Then;
export interface TypeOauth2Then {
  readonly flows: OauthFlows;
}

export type TypeOidc = TypeOidcThen;
export interface TypeOidcThen {
  readonly openIdConnectUrl: string;
}

export type UnionOfSchemaBoolean = Schema | boolean;
