export interface AuthorizationCode {
  readonly authorizationUrl: string;
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface Callbacks {
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type CallbacksOrReference = Reference | Callbacks;

export interface ClientCredentials {
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface Components {
  readonly callbacks?: ReadOnly<Record<string, CallbacksOrReference>> | undefined;
  readonly examples?: ReadOnly<Record<string, ExampleOrReference>> | undefined;
  readonly headers?: ReadOnly<Record<string, HeaderOrReference>> | undefined;
  readonly links?: ReadOnly<Record<string, LinkOrReference>> | undefined;
  readonly parameters?: ReadOnly<Record<string, ParameterOrReference>> | undefined;
  readonly pathItems?: ReadOnly<Record<string, PathItemOrReference>> | undefined;
  readonly requestBodies?: ReadOnly<Record<string, RequestBodyOrReference>> | undefined;
  readonly responses?: ReadOnly<Record<string, ResponseOrReference>> | undefined;
  readonly schemas?: ReadOnly<Record<string, SchemaObject>> | undefined;
  readonly securitySchemes?: ReadOnly<Record<string, SecuritySchemeOrReference>> | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type ComponentsPatternProperties = object;

export interface Contact {
  readonly email?: string | undefined;
  readonly name?: string | undefined;
  readonly url?: string | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface Content {
  readonly [key: string]: MediaType | undefined;
}

export type Encoding = IEncoding & SpecificationExtensions & StylesForForm;

export enum EncodingStyle {
  FORM = 'form',
  SPACE_DELIMITED = 'spaceDelimited',
  PIPE_DELIMITED = 'pipeDelimited',
  DEEP_OBJECT = 'deepObject',
}

export interface Example {
  readonly description?: string | undefined;
  readonly externalValue?: string | undefined;
  readonly summary?: string | undefined;
  readonly value?: any;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type ExampleOrReference = Reference | Example;

export interface Examples {
  readonly example?: any;
  readonly examples?: ReadOnly<Record<string, ExampleOrReference>> | undefined;
}

export interface ExternalDocumentation {
  readonly description?: string | undefined;
  readonly url: string;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type Header = IHeader & (HeaderWithSchema | HeaderWithContent);

export interface HeaderContent {
  readonly [key: string]: MediaType | undefined;
}

export type HeaderOrReference = Reference | Header;

export interface HeaderWithContent {
  readonly content: any;
}

export interface HeaderWithSchema {
  readonly schema: any;
}

export interface IEncoding {
  /**
   * @default false
   */
  readonly allowReserved?: boolean | undefined;
  readonly contentType?: string | undefined;
  readonly explode?: boolean | undefined;
  readonly headers?: ReadOnly<Record<string, HeaderOrReference>> | undefined;
  readonly style?: EncodingStyle | undefined;
}

export interface IHeader {
  readonly content?: HeaderContent | undefined;
  /**
   * @default false
   */
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  /**
   * @default false
   */
  readonly required?: boolean | undefined;
  readonly schema?: SchemaObject | undefined;
}

export interface ILink {
  readonly body?: Server | undefined;
  readonly description?: string | undefined;
  readonly operationId?: string | undefined;
  readonly operationRef?: string | undefined;
  readonly parameters?: MapOfStrings | undefined;
  readonly requestBody?: any;
}

export interface Implicit {
  readonly authorizationUrl: string;
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface Info {
  readonly contact?: Contact | undefined;
  readonly description?: string | undefined;
  readonly license?: License | undefined;
  readonly summary?: string | undefined;
  readonly termsOfService?: string | undefined;
  readonly title: string;
  readonly version: string;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface IParameterBase {
  readonly content?: ParameterContent | undefined;
  /**
   * @default false
   */
  readonly deprecated?: boolean | undefined;
  readonly description?: string | undefined;
  readonly in: ParameterIn;
  readonly name: string;
  /**
   * @default false
   */
  readonly required?: boolean | undefined;
  readonly schema?: SchemaObject | undefined;
}

export interface ISchema {
  readonly components?: Components | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly info: Info;
  /**
   * @default "https://spec.openapis.org/oas/3.1/dialect/base"
   */
  readonly jsonSchemaDialect?: string | undefined;
  readonly openapi: string;
  readonly paths?: Paths | undefined;
  readonly security?: ReadonlyArray<SecurityRequirement> | undefined;
  readonly servers?: ReadonlyArray<Server> | undefined;
  readonly tags?: ReadonlyArray<Tag> | undefined;
  readonly webhooks?: ReadOnly<Record<string, PathItemOrReference>> | undefined;
}

export interface License {
  readonly identifier?: string | undefined;
  readonly name: string;
  readonly url?: string | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type Link = ILink & (LinkWithOperationRef | LinkWithOperationId);
export type LinkOrReference = Reference | Link;

export interface LinkWithOperationId {
  readonly operationId: any;
}

export interface LinkWithOperationRef {
  readonly operationRef: any;
}

export interface MapOfStrings {
  readonly [key: string]: string | undefined;
}

export interface MediaType extends Examples, SpecificationExtensions {
  readonly encoding?: ReadOnly<Record<string, Encoding>> | undefined;
  readonly schema?: SchemaObject | undefined;
}

export interface OauthFlows {
  readonly authorizationCode?: AuthorizationCode | undefined;
  readonly clientCredentials?: ClientCredentials | undefined;
  readonly implicit?: Implicit | undefined;
  readonly password?: Password | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface Operation {
  readonly callbacks?: ReadOnly<Record<string, CallbacksOrReference>> | undefined;
  /**
   * @default false
   */
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
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type Parameter = ParameterBase & ParameterThen;
export type ParameterBase = IParameterBase & (ParameterWithSchema | ParameterWithContent);

export interface ParameterContent {
  readonly [key: string]: MediaType | undefined;
}

export enum ParameterIn {
  QUERY = 'query',
  HEADER = 'header',
  PATH = 'path',
  COOKIE = 'cookie',
}

export type ParameterOrReference = Reference | Parameter;

export interface ParameterThen {
  /**
   * @default false
   */
  readonly allowEmptyValue?: boolean | undefined;
}

export interface ParameterWithContent {
  readonly content: any;
}

export interface ParameterWithSchema {
  readonly schema: any;
}

export interface Password {
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface PathItem {
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
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type PathItemOrReference = Reference | PathItem;

export interface Paths {
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface Reference {
  readonly $ref?: string | undefined;
  readonly description?: string | undefined;
  readonly summary?: string | undefined;
}

export interface RequestBody {
  readonly content: Content;
  readonly description?: string | undefined;
  /**
   * @default false
   */
  readonly required?: boolean | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type RequestBodyOrReference = Reference | RequestBody;

export interface Response {
  readonly content?: Content | undefined;
  readonly description: string;
  readonly headers?: ReadOnly<Record<string, HeaderOrReference>> | undefined;
  readonly links?: ReadOnly<Record<string, LinkOrReference>> | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type ResponseOrReference = Reference | Response;
export type Responses = ResponsesBase & ResponsesThen;

export interface ResponsesBase {
  readonly default?: ResponseOrReference | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface ResponsesThen {
  readonly default: any;
}

export type Schema = ISchema & (SchemaWithPaths | SchemaWithComponents | SchemaWithWebhooks);
export type SchemaObject = SchemaObjectObject | boolean;
export type SchemaObjectObject = object;

export interface SchemaWithComponents {
  readonly components: any;
}

export interface SchemaWithPaths {
  readonly paths: any;
}

export interface SchemaWithWebhooks {
  readonly webhooks: any;
}

export interface SecurityRequirement {
  readonly [key: string]: ReadonlyArray<string> | undefined;
}

export interface SecurityScheme extends TypeApikeyThen, TypeHttpThen, TypeHttpBearerThen, TypeOauth2Then, TypeOidcThen, SpecificationExtensions {
  readonly description?: string | undefined;
  readonly type: SecuritySchemeType;
}

export type SecuritySchemeOrReference = Reference | SecurityScheme;

export enum SecuritySchemeType {
  API_KEY = 'apiKey',
  HTTP = 'http',
  MUTUAL_TLS = 'mutualTLS',
  OAUTH2 = 'oauth2',
  OPEN_ID_CONNECT = 'openIdConnect',
}

export interface Server {
  readonly description?: string | undefined;
  readonly url: string;
  readonly variables?: ReadOnly<Record<string, ServerVariable>> | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface ServerVariable {
  readonly default: string;
  readonly description?: string | undefined;
  readonly enum?: readonly [string, ...ReadonlyArray<string>] | undefined;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface SpecificationExtensions {
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export type StylesForForm = StylesForFormThen | StylesForFormElse;

export interface StylesForFormElse {
  /**
   * @default false
   */
  readonly explode?: boolean | undefined;
}

export interface StylesForFormThen {
  /**
   * @default true
   */
  readonly explode?: boolean | undefined;
}

export interface Tag {
  readonly description?: string | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly name: string;
  readonly [key: string /* Pattern: "^x-" */]: any;
}

export interface TypeApikeyThen {
  readonly in: TypeApikeyThenIn;
  readonly name: string;
}

export enum TypeApikeyThenIn {
  QUERY = 'query',
  HEADER = 'header',
  COOKIE = 'cookie',
}

export interface TypeHttpBearerThen {
  readonly bearerFormat?: string | undefined;
}

export interface TypeHttpThen {
  readonly scheme: string;
}

export interface TypeOauth2Then {
  readonly flows: OauthFlows;
}

export interface TypeOidcThen {
  readonly openIdConnectUrl: string;
}
