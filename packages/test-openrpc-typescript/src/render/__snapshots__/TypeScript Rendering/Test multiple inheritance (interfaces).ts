/**
 * Generated by Omnigen @ 2000-01-02T03:04:05.000Z
 */
export interface Abs {
  readonly kind?: string | undefined;
}

export interface A extends Abs {
  readonly foo?: string | undefined;
}

export interface B extends Abs {
  readonly bar?: string | undefined;
}

export interface C extends Abs {
  readonly xyz?: string | undefined;
}

export interface JsonRpcErrorResponse {
  readonly error: ErrorUnknownError;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: null | undefined;
}

export interface JsonRpcError {
  readonly code?: number | undefined;
  readonly data?: any | undefined;
  readonly message?: string | undefined;
}

export interface JsonRpcRequestParams {
  readonly param?: In | undefined;
}

export type GiveInGetOutRequestParams = JsonRpcRequestParams;

export interface JsonRpcResponse<T> {
  readonly error?: null | undefined;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: T | undefined;
}

export interface JsonRpcRequest<TParams extends JsonRpcRequestParams, TMethod extends string> {
  readonly id?: string | undefined;
  readonly method: TMethod;
  readonly params?: TParams | undefined;
  jsonrpc: '2.0';
}

export type GiveInGetOut2RequestParams = JsonRpcRequestParams;
export type UnionOfAB = A | B;
export type In = { readonly in_type?: string | undefined; } & UnionOfAB;
export type ErrorUnknownError = JsonRpcError;
export type ErrorUnknown = JsonRpcErrorResponse;
export type GiveInGetOut2Request = JsonRpcRequest<GiveInGetOut2RequestParams, 'give_in_get_out2'>;
export type GiveInGetOutRequest = JsonRpcRequest<GiveInGetOutRequestParams, 'give_in_get_out'>;

export interface Out2 extends B, C, A {

}

export interface Out {
  readonly result?: string | undefined;
}

export type GiveInGetOutResponse = JsonRpcResponse<Out>;
export type GiveInGetOut2Response = JsonRpcResponse<Out2>;
