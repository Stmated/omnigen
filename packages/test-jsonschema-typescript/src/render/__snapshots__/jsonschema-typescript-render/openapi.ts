export interface Reference {
  readonly $ref?: string | undefined;
  readonly description?: string | undefined;
  readonly summary?: string | undefined;
}

export type _202210070 = object;
export type _202210071 = object;
export type _202210072 = object;
export type ResponsesDefault = Reference | $defsResponse;
export type $defsExample = { readonly summary?: string | undefined;
  readonly description?: string | undefined;
  readonly value?: any;
  readonly externalValue?: string | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & NegationOfExampleObject;

export enum EncodingStyle {
  FORM = 'form',
  SPACE_DELIMITED = 'spaceDelimited',
  PIPE_DELIMITED = 'pipeDelimited',
  DEEP_OBJECT = 'deepObject',
}

export type UnionOfHeaderObjectHeader1 = HeaderObject | Header1;

export interface MapOfStrings {
  readonly [key: string]: string | undefined;
}

export enum ParameterInEnum {
  QUERY = 'query',
  HEADER = 'header',
  PATH = 'path',
  COOKIE = 'cookie',
}

export interface $defsOpenapiV31JsonParameter {
  readonly allowEmptyValue?: boolean | undefined;
  readonly content?: ParameterContent1 | undefined;
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  readonly in: ParameterInEnum;
  readonly name: string;
  readonly required?: boolean | undefined;
  readonly schema?: ParameterSchemaMeta | undefined;
}

export type ResponseOrReference = Reference | Response;
export type ParameterContent1 = ParameterContent;
export type HeaderContent = ParameterContent;

export interface AuthorizationCode extends SpecificationExtensions {
  readonly authorizationUrl: string;
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
}

export interface $defsRequestBody extends SpecificationExtensions {
  readonly content: ParameterContent;
  readonly description?: string | undefined;
  readonly required?: boolean | undefined;
}

export type $defsParameterOrReference = Reference | $defsParameter;

export interface ClientCredentials extends SpecificationExtensions {
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
}

export type CallbacksAdditionalProperties = Reference | PathItemobject;
export type ResponseLinksAdditionalProperties = Reference | Link;
export type RequestBodyOrReference = Reference | RequestBody;
export type ParameterOrReference = Reference | Parameter;
export type OperationRequestBody = Reference | $defsRequestBody;
export type ComponentsObject = object;

export interface ServerVariablesAdditionalProperties extends SpecificationExtensions {
  readonly default: string;
  readonly description?: string | undefined;
  readonly enum?: readonly [string, ...ReadonlyArray<string>] | undefined;
}

export interface ServerVariables {
  readonly [key: string]: ServerVariablesAdditionalProperties | undefined;
}

export interface Server extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly url: string;
  readonly variables?: ServerVariables | undefined;
}

export interface PathItemobject extends SpecificationExtensions {
  readonly delete?: PathItemGet | undefined;
  readonly description?: string | undefined;
  readonly get?: PathItemGet | undefined;
  readonly head?: PathItemGet | undefined;
  readonly options?: PathItemGet | undefined;
  readonly parameters?: ReadonlyArray<$defsParameterOrReference> | undefined;
  readonly patch?: PathItemGet | undefined;
  readonly post?: PathItemGet | undefined;
  readonly put?: PathItemGet | undefined;
  readonly servers?: ReadonlyArray<Server> | undefined;
  readonly summary?: string | undefined;
  readonly trace?: PathItemGet | undefined;
}

export interface ComponentsSchemas {
  readonly [key: string]: ComponentsSchemasAdditionalProperties | undefined;
}

export type ComponentsSchemasAdditionalProperties = object;

export interface Callbacks extends SpecificationExtensions {
  readonly [key: string]: CallbacksAdditionalProperties | undefined;
}

export type OperationCallbacksAdditionalProperties = Reference | Callbacks;

export interface Contact extends SpecificationExtensions {
  readonly email?: string | undefined;
  readonly name?: string | undefined;
  readonly url?: string | undefined;
}

export enum SecuritySchemeType {
  API_KEY = 'apiKey',
  HTTP = 'http',
  MUTUAL_TLS = 'mutualTLS',
  OAUTH2 = 'oauth2',
  OPEN_ID_CONNECT = 'openIdConnect',
}

export interface TypeApikeyThen {
  readonly description?: string | undefined;
  readonly in: TypeApikeyIn;
  readonly name: string;
  readonly type: SecuritySchemeType;
}

export interface TypeApikey extends TypeApikeyThen {
  readonly description?: string | undefined;
  readonly type: SecuritySchemeType;
}

export interface TypeHttpThen {
  readonly description?: string | undefined;
  readonly scheme: string;
  readonly type: SecuritySchemeType;
}

export interface TypeHttp extends TypeHttpThen {
  readonly description?: string | undefined;
  readonly type: SecuritySchemeType;
}

export interface TypeHttpBearerThen {
  readonly bearerFormat?: string | undefined;
  readonly description?: string | undefined;
  readonly type: SecuritySchemeType;
}

export type Example = { readonly summary?: string | undefined;
  readonly description?: string | undefined;
  readonly value?: any;
  readonly externalValue?: string | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & NegationOfExampleObject;
export type ExampleObject = object;

export interface TypeHttpBearer extends TypeHttpBearerThen {
  readonly description?: string | undefined;
  readonly type: SecuritySchemeType;
}

export interface TypeOauth2Then {
  readonly description?: string | undefined;
  readonly flows: OauthFlows;
  readonly type: SecuritySchemeType;
}

export interface TypeOauth2 extends TypeOauth2Then {
  readonly description?: string | undefined;
  readonly type: SecuritySchemeType;
}

export interface TypeOidcThen {
  readonly description?: string | undefined;
  readonly openIdConnectUrl: string;
  readonly type: SecuritySchemeType;
}

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
export type ExamplesExamplesAdditionalProperties = Reference | Example;
export type HeaderObject = object;
export type HeaderSchemaMeta = object;

export interface Implicit extends SpecificationExtensions {
  readonly authorizationUrl: string;
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
}

export interface License extends SpecificationExtensions {
  readonly identifier?: string | undefined;
  readonly name: string;
  readonly url?: string | undefined;
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

export type UnionOfLinkObjectLink1 = LinkObject | Link1;
export type Link1 = object;
export type LinkObject = object;
export type $defsLink = { readonly operationRef?: string | undefined;
  readonly operationId?: string | undefined;
  readonly parameters?: MapOfStrings | undefined;
  readonly requestBody?: any;
  readonly description?: string | undefined;
  readonly body?: Server | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & UnionOfLinkObjectLink1;

export interface StylesForFormElse {
  readonly explode?: boolean | undefined;
}

export interface StylesForFormThen {
  readonly explode?: boolean | undefined;
}

export interface TypeOidc extends TypeOidcThen {
  readonly description?: string | undefined;
  readonly type: SecuritySchemeType;
}

export interface SecurityScheme extends TypeHttp, TypeHttpBearer, TypeOauth2, TypeOidc, TypeApikey {
  readonly description?: string | undefined;
  readonly type: SecuritySchemeType;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type MediaTypeSchemaMeta = object;

export interface Password extends SpecificationExtensions {
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
}

export type EncodingHeadersAdditionalProperties = Reference | Header;
export type $defsHeader = { readonly description?: string | undefined;
  readonly required?: boolean | undefined;
  readonly deprecated?: boolean | undefined;
  readonly schema?: HeaderSchemaMeta | undefined;
  readonly content?: HeaderContent | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & UnionOfHeaderObjectHeader1;
export type ObjectAdditionalProperties = Reference | $defsLink;
export type MediaTypeEncodingAdditionalPropertiesHeadersAdditionalProperties = Reference | $defsHeader;
export type ComponentsSecuritySchemesAdditionalProperties = Reference | SecurityScheme;
export type Link = { readonly operationRef?: string | undefined;
  readonly operationId?: string | undefined;
  readonly parameters?: MapOfStrings | undefined;
  readonly requestBody?: any;
  readonly description?: string | undefined;
  readonly body?: Server | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & UnionOfLinkObjectLink1;

export interface $defsResponse extends SpecificationExtensions {
  readonly content?: ParameterContent | undefined;
  readonly description: string;
  readonly headers?: ResponseHeadersobject | undefined;
  readonly links?: ResponseLinksobject | undefined;
}

export interface ParameterThen {
  readonly allowEmptyValue?: boolean | undefined;
  readonly content?: ParameterContentobject | undefined;
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  readonly in: ParameterInEnum;
  readonly name: string;
  readonly required?: boolean | undefined;
  readonly schema?: ParameterSchemaMeta | undefined;
}

export type Parameter1 = object;

export interface ComponentsSecuritySchemes {
  readonly [key: string]: ComponentsSecuritySchemesAdditionalProperties | undefined;
}

export interface ContentAdditionalPropertiesEncoding {
  readonly [key: string]: ContentAdditionalPropertiesEncodingAdditionalProperties | undefined;
}

export type ParameterContentobject = Content;

export interface $defsParameter extends SpecificationExtensions, $defsOpenapiV31JsonParameter {

}

export type ParameterObject = object;

export interface ComponentsHeaders {
  readonly [key: string]: EncodingHeadersAdditionalProperties | undefined;
}

export type ParameterSchemaMeta = object;

export interface Parameter extends SpecificationExtensions, ParameterThen {

}

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

export interface SecurityRequirement {
  readonly [key: string]: ReadonlyArray<string> | undefined;
}

export interface ResponseHeaders {
  readonly [key: string]: EncodingHeadersAdditionalProperties | undefined;
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

export interface ComponentsRequestBodies {
  readonly [key: string]: RequestBodyOrReference | undefined;
}

export interface RequestBody extends SpecificationExtensions {
  readonly content: Content;
  readonly description?: string | undefined;
  readonly required?: boolean | undefined;
}

export interface ComponentsExamples {
  readonly [key: string]: ExamplesExamplesAdditionalProperties | undefined;
}

export interface ResponseLinks {
  readonly [key: string]: ResponseLinksAdditionalProperties | undefined;
}

export interface Response extends SpecificationExtensions {
  readonly content?: Content | undefined;
  readonly description: string;
  readonly headers?: ResponseHeaders | undefined;
  readonly links?: ResponseLinks | undefined;
}

export interface ResponseHeadersobject {
  readonly [key: string]: MediaTypeEncodingAdditionalPropertiesHeadersAdditionalProperties | undefined;
}

export interface ComponentsResponses {
  readonly [key: string]: ResponseOrReference | undefined;
}

export interface ComponentsCallbacks {
  readonly [key: string]: OperationCallbacksAdditionalProperties | undefined;
}

export interface ResponseLinksobject {
  readonly [key: string]: ObjectAdditionalProperties | undefined;
}

export interface ComponentsPathItems {
  readonly [key: string]: CallbacksAdditionalProperties | undefined;
}

export interface ResponsesThen {
  readonly default?: ResponseOrReference | undefined;
}

export interface _20221007Webhooks {
  readonly [key: string]: CallbacksAdditionalProperties | undefined;
}

export interface Responses extends ResponsesThen {
  readonly default?: ResponseOrReference | undefined;
  readonly [key: string /* Pattern: "^[1-5](?:[0-9]{2}|XX)$" */]: ResponseOrReference | undefined;
}

export type Schema = Schemaobject | boolean;
export type Schemaobject = object;

export interface OperationCallbacks {
  readonly [key: string]: OperationCallbacksAdditionalProperties | undefined;
}

export interface OperationResponses extends Object {
  readonly default?: ResponsesDefault | undefined;
  readonly [key: string /* Pattern: "^[1-5](?:[0-9]{2}|XX)$" */]: ResponsesDefault | undefined;
}

export interface EncodingHeaders {
  readonly [key: string]: EncodingHeadersAdditionalProperties | undefined;
}

export interface ComponentsParameters {
  readonly [key: string]: ParameterOrReference | undefined;
}

export interface ComponentsLinks {
  readonly [key: string]: ResponseLinksAdditionalProperties | undefined;
}

export interface Tag extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly name: string;
}

export type StylesForForm = StylesForFormThen | StylesForFormElse;
export type MediaTypeEncodingAdditionalProperties = { readonly contentType?: string | undefined;
  readonly headers?: EncodingHeaders | undefined;
  readonly style?: EncodingStyle | undefined;
  readonly explode?: boolean | undefined;
  readonly allowReserved?: boolean | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & StylesForForm;

export interface MediaTypeEncoding {
  readonly [key: string]: MediaTypeEncodingAdditionalProperties | undefined;
}

export interface Paths extends SpecificationExtensions {
  readonly [key: string /* Pattern: "^\/" */]: PathItem | undefined;
}

export interface MediaTypeEncodingAdditionalPropertiesHeaders {
  readonly [key: string]: MediaTypeEncodingAdditionalPropertiesHeadersAdditionalProperties | undefined;
}

export enum TypeApikeyIn {
  QUERY = 'query',
  HEADER = 'header',
  COOKIE = 'cookie',
}

export interface ExamplesExamplesobject {
  readonly [key: string]: ExamplesExamplesobjectAdditionalProperties | undefined;
}

export interface Object {
  readonly default?: ResponsesDefault | undefined;
}

export interface ExamplesExamples {
  readonly [key: string]: ExamplesExamplesAdditionalProperties | undefined;
}

export interface $defsExamples {
  readonly encoding?: ContentAdditionalPropertiesEncoding | undefined;
  readonly example?: any;
  readonly examples?: ExamplesExamplesobject | undefined;
  readonly schema?: MediaTypeSchemaMeta | undefined;
}

export interface Examples {
  readonly encoding?: MediaTypeEncoding | undefined;
  readonly example?: any;
  readonly examples?: ExamplesExamples | undefined;
  readonly schema?: MediaTypeSchemaMeta | undefined;
}

export interface PathItemGet extends SpecificationExtensions {
  readonly callbacks?: OperationCallbacks | undefined;
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly operationId?: string | undefined;
  readonly parameters?: ReadonlyArray<$defsParameterOrReference> | undefined;
  readonly requestBody?: OperationRequestBody | undefined;
  readonly responses?: OperationResponses | undefined;
  readonly security?: ReadonlyArray<SecurityRequirement> | undefined;
  readonly servers?: ReadonlyArray<Server> | undefined;
  readonly summary?: string | undefined;
  readonly tags?: ReadonlyArray<string> | undefined;
}

export interface ContentAdditionalProperties extends Examples {
  readonly encoding?: MediaTypeEncoding | undefined;
  readonly schema?: MediaTypeSchemaMeta | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type ContentAdditionalPropertiesEncodingAdditionalProperties = { readonly contentType?: string | undefined;
  readonly headers?: MediaTypeEncodingAdditionalPropertiesHeaders | undefined;
  readonly style?: EncodingStyle | undefined;
  readonly explode?: boolean | undefined;
  readonly allowReserved?: boolean | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any; } & StylesForForm;

export interface ParameterContentAdditionalProperties extends $defsExamples {
  readonly encoding?: ContentAdditionalPropertiesEncoding | undefined;
  readonly schema?: MediaTypeSchemaMeta | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
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
export type UnionOfParameterObjectParameter1 = ParameterObject | Parameter1;
