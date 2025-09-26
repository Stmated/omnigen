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
  readonly [key: string /* Pattern: "^(schemas|responses|parameters|examples|requestBodies|headers|securitySchemes|links|callbacks|pathItems)$" */]: ComponentsPatternProperties | undefined;
}

export type ComponentsPatternProperties = object;

export interface Contact extends SpecificationExtensions {
  readonly email?: string | undefined;
  readonly name?: string | undefined;
  readonly url?: string | undefined;
}

export type Encoding = IEncoding & SpecificationExtensions & StylesForForm;

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
  readonly examples?: ReadOnly<Record<string, ExampleOrReference>> | undefined;
}

export interface ExternalDocumentation extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly url: string;
}

export interface FixedFields10 {
  readonly [key: string]: MediaType | undefined;
}

export type Header = IHeader & SpecificationExtensions & (HeaderWithSchema | HeaderWithContent);
export type HeaderContent = FixedFields10;
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

export interface License extends SpecificationExtensions {
  readonly identifier?: string | undefined;
  readonly name: string;
  readonly url?: string | undefined;
}

export type Link = ILink & SpecificationExtensions & (LinkWithOperationRef | LinkWithOperationId);
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

export interface OauthFlows extends SpecificationExtensions {
  readonly authorizationCode?: AuthorizationCode | undefined;
  readonly clientCredentials?: ClientCredentials | undefined;
  readonly implicit?: Implicit | undefined;
  readonly password?: Password | undefined;
}

export interface Operation extends SpecificationExtensions {
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
}

export type Parameter = ParameterBase & ParameterThen;
export type ParameterBase = IParameterBase & SpecificationExtensions & (ParameterWithSchema | ParameterWithContent);
export type ParameterContent = FixedFields10;

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
  readonly content: FixedFields10;
  readonly description?: string | undefined;
  /**
   * @default false
   */
  readonly required?: boolean | undefined;
}

export type RequestBodyOrReference = Reference | RequestBody;

export interface Response extends SpecificationExtensions {
  readonly content?: FixedFields10 | undefined;
  readonly description: string;
  readonly headers?: ReadOnly<Record<string, HeaderOrReference>> | undefined;
  readonly links?: ReadOnly<Record<string, LinkOrReference>> | undefined;
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

export type Schema = ISchema & (SchemaWithPaths | SchemaWithComponents | SchemaWithWebhooks) & SpecificationExtensions;
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

export interface Server extends SpecificationExtensions {
  readonly description?: string | undefined;
  readonly url: string;
  readonly variables?: ReadOnly<Record<string, ServerVariable>> | undefined;
}

export interface ServerVariable extends SpecificationExtensions {
  readonly default: string;
  readonly description?: string | undefined;
  readonly enum?: readonly [string, ...ReadonlyArray<string>] | undefined;
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
