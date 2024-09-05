export type _20221007 = { readonly openapi: string;
  readonly info: Info;
  readonly jsonSchemaDialect?: string | undefined;
  readonly servers?: ReadonlyArray<Server> | undefined;
  readonly paths?: Paths | undefined;
  readonly webhooks?: _20221007Webhooks | undefined;
  readonly components?: Components | undefined;
  readonly security?: ReadonlyArray<SecurityRequirement> | undefined;
  readonly tags?: ReadonlyArray<Tag> | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & UnionOf202210070202210071202210072;
export type _202210070 = object;
export type _202210071 = object;
export type _202210072 = object;

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
  readonly [key: string /* Pattern: "^(schemas|responses|parameters|examples|requestBodies|headers|securitySchemes|links|callbacks|pathItems)$" */]: ComponentsObject | undefined;
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

export type ComponentsObject = object;

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

export type ContentAdditionalProperties = Examples;

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

export type Example = { readonly summary?: string | undefined;
  readonly description?: string | undefined;
  readonly value?: any;
  readonly externalValue?: string | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & NegationOfExampleObject;
export type ExampleObject = object;

export interface Examples {
  readonly encoding?: MediaTypeEncoding | undefined;
  readonly example?: any;
  readonly examples?: ExamplesExamples | undefined;
  readonly schema?: MediaTypeSchemaMeta | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface ExamplesExamples {
  readonly [key: string]: ExamplesExamplesAdditionalProperties | undefined;
}

export type ExamplesExamplesAdditionalProperties = Reference | Example;

export interface ExternalDocumentation extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly url: string;
}

export type Header = { readonly description?: string | undefined;
  readonly required?: boolean | undefined;
  readonly deprecated?: boolean | undefined;
  readonly schema?: HeaderSchemaMeta | undefined;
  readonly content?: HeaderContent | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & UnionOfHeaderObjectHeader1;
export type Header1 = object;
export type HeaderContent = Content;
export type HeaderObject = object;
export type HeaderSchemaMeta = object;

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

export type Link = { readonly operationRef?: string | undefined;
  readonly operationId?: string | undefined;
  readonly parameters?: MapOfStrings | undefined;
  readonly requestBody?: any;
  readonly description?: string | undefined;
  readonly body?: Server | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & UnionOfLinkObjectLink1;
export type Link1 = object;
export type LinkObject = object;

export interface MapOfStrings {
  readonly [key: string]: string | undefined;
}

export interface MediaTypeEncoding {
  readonly [key: string]: MediaTypeEncodingAdditionalProperties | undefined;
}

export type MediaTypeEncodingAdditionalProperties = { readonly contentType?: string | undefined;
  readonly headers?: EncodingHeaders | undefined;
  readonly style?: EncodingStyle | undefined;
  readonly explode?: boolean | undefined;
  readonly allowReserved?: boolean | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & StylesForForm;
export type MediaTypeSchemaMeta = object;

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

export interface Parameter extends SpecificationExtensions, ParameterThen {

}

export type Parameter1 = object;
export type ParameterContent = Content;

export enum ParameterInEnum {
  QUERY = 'query',
  HEADER = 'header',
  PATH = 'path',
  COOKIE = 'cookie',
}

export type ParameterObject = object;
export type ParameterOrReference = Reference | Parameter;
export type ParameterSchemaMeta = object;

export interface ParameterThen {
  readonly allowEmptyValue?: boolean | undefined;
  readonly content?: ParameterContent | undefined;
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  readonly in: ParameterInEnum;
  readonly name: string;
  readonly required?: boolean | undefined;
  readonly schema?: ParameterSchemaMeta | undefined;
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
export type Responses = ResponsesThen;

export interface ResponsesThen {
  readonly default?: ResponseOrReference | undefined;
  readonly [key: string /* Pattern: "^[1-5](?:[0-9]{2}|XX)$" */]: ResponseOrReference | undefined;
}

export type Schema = Schemaobject | boolean;
export type Schemaobject = object;

export interface SecurityRequirement {
  readonly [key: string]: ReadonlyArray<string> | undefined;
}

export interface SecurityScheme extends TypeHttp, TypeHttpBearer, TypeOauth2, TypeOidc, TypeApikey {

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
  readonly [key: string /* Pattern: "^x-" */]: any;
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

export type UnionOfHeaderObjectHeader1 = HeaderObject | Header1;
export type UnionOfLinkObjectLink1 = LinkObject | Link1;
export type UnionOfParameterObjectParameter1 = ParameterObject | Parameter1;
