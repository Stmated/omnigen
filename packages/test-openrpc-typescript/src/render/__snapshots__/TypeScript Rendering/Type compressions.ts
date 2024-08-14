/**
 * Generated by Omnigen @ 2000-01-02T03:04:05.000Z
 */
export interface A extends Abs {
  readonly a?: string | undefined;
  readonly x?: string | undefined;
}

export interface Abs {
  readonly common?: string | undefined;
  readonly kind?: string | undefined;
}

export interface B extends Abs {
  readonly b?: string | undefined;
  readonly x?: number | undefined;
}

export type ErrorUnknown = JsonRpcErrorResponse;
export type ErrorUnknownError = JsonRpcError;

export interface GiveIn1GetOut1Request extends JsonRpcRequest {
  readonly method: 'give_in1_get_out1';
  readonly params?: GiveIn1GetOut1RequestParams | undefined;
}

export interface GiveIn1GetOut1RequestParams extends JsonRpcRequestParams {
  readonly param?: In1 | undefined;
}

export interface GiveIn1GetOut1Response extends JsonRpcResponse {
  readonly result?: A | undefined;
}

export interface GiveIn2GetOut2Request extends JsonRpcRequest {
  readonly method: 'give_in2_get_out2';
  readonly params?: GiveIn2GetOut2RequestParams | undefined;
}

export interface GiveIn2GetOut2RequestParams extends JsonRpcRequestParams {
  readonly param?: In2 | undefined;
}

export interface GiveIn2GetOut2Response extends JsonRpcResponse {
  readonly result?: B | undefined;
}

export interface In1 {
  readonly value?: string | undefined;
}

export interface In2 {
  readonly value?: string | undefined;
}

export interface JsonRpcError {
  readonly code?: number | undefined;
  readonly data?: any | undefined;
  readonly message?: string | undefined;
}

export interface JsonRpcErrorResponse {
  readonly error: ErrorUnknownError;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: null | undefined;
}

export interface JsonRpcRequest {
  readonly id?: string | undefined;
  readonly jsonrpc: '2.0';
  readonly method: 'give_in1_get_out1' | 'give_in2_get_out2';
}

export type JsonRpcRequestParams = object;

export interface JsonRpcResponse {
  readonly error?: null | undefined;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
}
