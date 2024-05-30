export type ErrorUnknown = JsonRpcErrorResponse;
export type ErrorUnknownError = JsonRpcError;
/**
 * Generated by Omnigen @ 2000-01-02T03:04:05.000Z
 */
export interface JsonRpcError {
  readonly code?: number | undefined;
  readonly data?: any | undefined;
  readonly message?: string | undefined;
}

export interface JsonRpcErrorResponse {
  readonly error: ErrorUnknownError;
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

export type ListThingsRequest = JsonRpcRequest;
export type ListThingsRequestParams = JsonRpcRequestParams;
export type ListThingsResponse = JsonRpcResponse;
export interface Thing {
  readonly id: string;
  readonly [key: string]: any;
}
