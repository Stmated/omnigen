/**
 * Generated by Omnigen @ 2000-01-02T03:04:05.000Z
 */
export class A extends Abs<string> {
  readonly a?: string | undefined;

  public constructor(kind: string | undefined, common: string | undefined, x: string | undefined, a: string | undefined) {
    super(kind, common, x);
    this.a = a;
  }
}

export class Abs<T> {
  readonly common?: string | undefined;
  readonly kind?: string | undefined;
  readonly x?: T | undefined;

  public constructor(kind: string | undefined, common: string | undefined, x: T | undefined) {
    this.kind = kind;
    this.common = common;
    this.x = x;
  }
}

export class B extends Abs<number> {
  readonly b?: string | undefined;

  public constructor(kind: string | undefined, common: string | undefined, x: number | undefined, b: string | undefined) {
    super(kind, common, x);
    this.b = b;
  }
}

export class ErrorUnknown extends JsonRpcErrorResponse {
  public constructor(jsonrpc: '2.0' | undefined, error: ErrorUnknownError, result: undefined, id: string | undefined) {
    super(jsonrpc, error, result, id);
  }
}

export class ErrorUnknownError extends JsonRpcError {
  public constructor(code: number | undefined, message: string | undefined, data: any | undefined) {
    super(code, message, data);
  }
}

export class GiveIn1GetOut1Request extends JsonRpcRequest<GiveIn1GetOut1RequestParams, 'give_in1_get_out1'> {
  public constructor(id: string, params: GiveIn1GetOut1RequestParams | undefined) {
    super(id, params, 'give_in1_get_out1');
  }
}

export class GiveIn1GetOut1RequestParams extends JsonRpcRequestParams<In1> {
  public constructor(param: In1 | undefined) {
    super(param);
  }
}

export class GiveIn1GetOut1Response extends JsonRpcResponse<A> {
  public constructor(jsonrpc: '2.0' | undefined, error: undefined, id: string | undefined, result: A | undefined) {
    super(jsonrpc, error, id, result);
  }
}

export class GiveIn2GetOut2Request extends JsonRpcRequest<GiveIn2GetOut2RequestParams, 'give_in2_get_out2'> {
  public constructor(id: string, params: GiveIn2GetOut2RequestParams | undefined) {
    super(id, params, 'give_in2_get_out2');
  }
}

export class GiveIn2GetOut2RequestParams extends JsonRpcRequestParams<In2> {
  public constructor(param: In2 | undefined) {
    super(param);
  }
}

export class GiveIn2GetOut2Response extends JsonRpcResponse<B> {
  public constructor(jsonrpc: '2.0' | undefined, error: undefined, id: string | undefined, result: B | undefined) {
    super(jsonrpc, error, id, result);
  }
}

export class In1 {
  readonly value?: string | undefined;

  public constructor(value: string | undefined) {
    this.value = value;
  }
}

export class In2 {
  readonly value?: string | undefined;

  public constructor(value: string | undefined) {
    this.value = value;
  }
}

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
export class JsonRpcError {
  readonly code?: number | undefined;
  readonly data?: any | undefined;
  readonly message?: string | undefined;

  public constructor(code: number | undefined, message: string | undefined, data: any | undefined) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

/**
 * Generic class to describe the JsonRpc error response package
 */
export class JsonRpcErrorResponse {
  readonly error: ErrorUnknownError;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: undefined;

  public constructor(jsonrpc: '2.0' | undefined, error: ErrorUnknownError, result: undefined, id: string | undefined) {
    this.jsonrpc = jsonrpc;
    this.error = error;
    this.result = result;
    this.id = id;
  }
}

/**
 * Generic class to describe the JsonRpc request package
 */
export class JsonRpcRequest<TParams extends JsonRpcRequestParams<any>, TMethod extends string> {
  readonly id: string;
  readonly method: TMethod;
  readonly params?: TParams | undefined;

  public constructor(id: string, params: TParams | undefined, method: TMethod) {
    this.id = id;
    this.params = params;
    this.method = method;
  }

  public getJsonrpc() {
    return '2.0';
  }
}

/**
 * Generic class to describe the JsonRpc request params
 */
export class JsonRpcRequestParams<T> {
  readonly param?: T | undefined;

  public constructor(param: T | undefined) {
    this.param = param;
  }
}

/**
 * Generic class to describe the JsonRpc response package
 */
export class JsonRpcResponse<T extends Abs<any>> {
  readonly error?: undefined;
  readonly id?: string | undefined;
  readonly jsonrpc?: '2.0' | undefined;
  readonly result?: T | undefined;

  public constructor(jsonrpc: '2.0' | undefined, error: undefined, id: string | undefined, result: T | undefined) {
    this.jsonrpc = jsonrpc;
    this.error = error;
    this.id = id;
    this.result = result;
  }
}