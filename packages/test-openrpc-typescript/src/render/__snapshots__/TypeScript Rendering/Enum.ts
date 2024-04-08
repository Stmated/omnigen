export type ErrorUnknown = JsonRpcErrorResponse<ErrorUnknownError>;
export type ErrorUnknownError = JsonRpcError<number, string>;
export interface JsonRpcError<TCode extends number, TMessage extends string> {
  readonly code?: TCode | undefined;
  readonly data?: any | undefined;
  readonly message?: TMessage | undefined;
}

export interface JsonRpcErrorResponse<T extends JsonRpcError<number, string>> {
  readonly error: T;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: undefined;
}

export interface JsonRpcRequest {
  readonly id: string;
  readonly params?: ListThingsRequestParams | undefined;
  jsonrpc: '2.0';
  method: 'list_things';
}

export type JsonRpcRequestParams = object;
export interface JsonRpcResponse {
  readonly error?: undefined;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: ReadonlyArray<Thing> | undefined;
}

export type ListThingsError100 = JsonRpcErrorResponse<ListThingsError100Error>;
export type ListThingsError100Error = JsonRpcError<100, string>;
export type ListThingsRequest = JsonRpcRequest;
export type ListThingsRequestParams = JsonRpcRequestParams;
export type ListThingsResponse = JsonRpcResponse;
export enum Tag {
  TAG_A = 'TagA',
  TAG_B = 'TagB',
  TAG_C = 'TagC',
}

export interface Thing {
  readonly id: string;
  readonly tag?: Tag | undefined;
  readonly type?: ThingType | undefined;
}

export enum ThingType {
  TYPE_A = 'TypeA',
  TYPE_B = 'TypeB',
  TYPE_C = 'TypeC',
}

