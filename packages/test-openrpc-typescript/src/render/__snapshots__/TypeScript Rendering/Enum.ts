export type ListThingsError100Error = JsonRpcError<100, string>;

export interface JsonRpcError<TCode extends number> {
  readonly code?: TCode | undefined;
  readonly data?: any | undefined;
  readonly message?: string | undefined;
}

export type ErrorUnknownError = JsonRpcError<number, string>;

export interface JsonRpcErrorResponse<T extends JsonRpcError<number>> {
  readonly error: T;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: null | undefined;
}

export interface JsonRpcRequest {
  readonly id?: string | undefined;
  readonly params?: ListThingsRequestParams | undefined;
  jsonrpc: '2.0';
  method: 'list_things';
}

export type JsonRpcRequestParams = object;

export enum ThingType {
  TYPE_A = 'TypeA',
  TYPE_B = 'TypeB',
  TYPE_C = 'TypeC',
}

export type ErrorUnknown = JsonRpcErrorResponse<ErrorUnknownError>;
export type ListThingsError100 = JsonRpcErrorResponse<ListThingsError100Error>;
export type ListThingsRequest = JsonRpcRequest;
export type ListThingsRequestParams = JsonRpcRequestParams;

export interface JsonRpcResponse {
  readonly error?: null | undefined;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: ReadonlyArray<Thing> | undefined;
}

export enum Species {
  SPECIES_A = 'SpeciesA',
  SPECIES_B = 'SpeciesB',
}

export enum Tag {
  TAG_A = 'TagA',
  TAG_B = 'TagB',
  TAG_C = 'TagC',
}

export enum TagOrSpeciesOrStringDouble {
  _1337 = 1337,
}

export type TagOrSpeciesOrString = Tag | Species | 'foo' | TagOrSpeciesOrStringDouble | string;

export interface Thing {
  readonly id: string;
  readonly tag?: Tag | undefined;
  readonly type?: ThingType | undefined;
}

export type ListThingsResponse = JsonRpcResponse;
