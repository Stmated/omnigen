export interface AuthorizationCode extends SpecificationExtensions {
  readonly authorizationUrl: string;
  readonly refreshUrl?: string | undefined;
  readonly scopes: MapOfStrings;
  readonly tokenUrl: string;
}

export interface Callbacks extends SpecificationExtensions {
  readonly [key: string]: PathItemOrReference | undefined;
}

export type CallbacksOrReference = Reference | Callbacks;

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
  readonly [key: string /* Pattern: "^(schemas|responses|parameters|examples|requestBodies|headers|securitySchemes|links|callbacks|pathItems)$" */]: ComponentsPatternProperties | undefined;
}

export interface ComponentsCallbacks {
  readonly [key: string]: CallbacksOrReference | undefined;
}

export interface ComponentsExamples {
  readonly [key: string]: ExampleOrReference | undefined;
}

export interface ComponentsHeaders {
  readonly [key: string]: HeaderOrReference | undefined;
}

export interface ComponentsLinks {
  readonly [key: string]: LinkOrReference | undefined;
}

export interface ComponentsParameters {
  readonly [key: string]: ParameterOrReference | undefined;
}

export interface ComponentsPathItems {
  readonly [key: string]: PathItemOrReference | undefined;
}

export type ComponentsPatternProperties = object;

export interface ComponentsRequestBodies {
  readonly [key: string]: RequestBodyOrReference | undefined;
}

export interface ComponentsResponses {
  readonly [key: string]: ResponseOrReference | undefined;
}

export interface ComponentsSchemas {
  readonly [key: string]: SchemaObject | undefined;
}

export interface ComponentsSecuritySchemes {
  readonly [key: string]: SecuritySchemeOrReference | undefined;
}

export interface Contact extends SpecificationExtensions {
  readonly email?: string | undefined;
  readonly name?: string | undefined;
  readonly url?: string | undefined;
}

export interface Content {
  readonly [key: string]: MediaType | undefined;
}

export type Encoding = EncodingInterface & SpecificationExtensions & StylesForForm;

export interface EncodingHeaders {
  readonly [key: string]: HeaderOrReference | undefined;
}

export interface EncodingInterface {
  /**
   * @default false
   */
  readonly allowReserved?: boolean | undefined;
  readonly contentType?: string | undefined;
  readonly explode?: boolean | undefined;
  readonly headers?: EncodingHeaders | undefined;
  readonly style?: EncodingStyle | undefined;
}

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

export type ExampleOrReference = Reference | Example;

export interface Examples {
  readonly example?: any;
  readonly examples?: ExamplesExamples | undefined;
}

export interface ExamplesExamples {
  readonly [key: string]: ExampleOrReference | undefined;
}

export interface ExternalDocumentation extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly url: string;
}

export type Header = HeaderInterface & SpecificationExtensions & (HeaderWithSchema | HeaderWithContent);
export type HeaderContent = Content;

export interface HeaderInterface {
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

export type HeaderOrReference = Reference | Header;

export interface HeaderWithContent {
  readonly content: any;
}

export interface HeaderWithSchema {
  readonly schema: any;
}

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

export type Link = LinkInterface & SpecificationExtensions & (LinkWithOperationRef | LinkWithOperationId);

export interface LinkInterface {
  readonly body?: Server | undefined;
  readonly description?: string | undefined;
  readonly operationId?: string | undefined;
  readonly operationRef?: string | undefined;
  readonly parameters?: MapOfStrings | undefined;
  readonly requestBody?: any;
}

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
  readonly encoding?: MediaTypeEncoding | undefined;
  readonly schema?: SchemaObject | undefined;
}

export interface MediaTypeEncoding {
  readonly [key: string]: Encoding | undefined;
}

export interface OauthFlows extends SpecificationExtensions {
  readonly authorizationCode?: AuthorizationCode | undefined;
  readonly clientCredentials?: ClientCredentials | undefined;
  readonly implicit?: Implicit | undefined;
  readonly password?: Password | undefined;
}

export interface Operation extends SpecificationExtensions {
  readonly callbacks?: OperationCallbacks | undefined;
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
}

export interface OperationCallbacks {
  readonly [key: string]: CallbacksOrReference | undefined;
}

export type Parameter = ParameterBase & ParameterThen;
export type ParameterBase = ParameterBaseInterface & SpecificationExtensions & (ParameterWithSchema | ParameterWithContent);

export interface ParameterBaseInterface {
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

export type ParameterContent = Content;

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

export type PathItemOrReference = Reference | PathItem;

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
  /**
   * @default false
   */
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
  readonly [key: string]: HeaderOrReference | undefined;
}

export interface ResponseLinks {
  readonly [key: string]: LinkOrReference | undefined;
}

export type ResponseOrReference = Reference | Response;
export type Responses = ResponsesBase & ResponsesThen;

export interface ResponsesBase extends SpecificationExtensions {
  readonly default?: ResponseOrReference | undefined;
  readonly [key: string /* Pattern: "^[1-5](?:[0-9]{2}|XX)$" */]: ResponseOrReference | undefined;
}

export interface ResponsesThen {
  readonly default: any;
}

export type Schema = SchemaInterface & (SchemaWithPaths | SchemaWithComponents | SchemaWithWebhooks) & SpecificationExtensions;

export interface SchemaInterface {
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
  readonly webhooks?: SchemaWebhooks | undefined;
}

export type SchemaObject = SchemaObjectObject | boolean;
export type SchemaObjectObject = object;

export interface SchemaWebhooks {
  readonly [key: string]: PathItemOrReference | undefined;
}

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

export interface Server extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly url: string;
  readonly variables?: ServerVariables | undefined;
}

export interface ServerVariable extends SpecificationExtensions {
  readonly default: string;
  readonly description?: string | undefined;
  readonly enum?: readonly [string, ...ReadonlyArray<string>] | undefined;
}

export interface ServerVariables {
  readonly [key: string]: ServerVariable | undefined;
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

export interface Tag extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly externalDocs?: ExternalDocumentation | undefined;
  readonly name: string;
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
