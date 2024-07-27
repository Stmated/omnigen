/**
 * Generated by Omnigen @ 2000-01-02T03:04:05.000Z
 */
export class Abs<T> {
  private readonly _common?: string;
  private readonly _kind?: string;
  private readonly _x?: T;

  get common() { return this._common; }
  get kind() { return this._kind; }
  get x() { return this._x; }

  public constructor(kind: string, common: string, x: T) {
    this._kind = kind;
    this._common = common;
    this._x = x;
  }
}

export class A extends Abs<string> {
  private readonly _a?: string;

  get a() { return this._a; }

  public constructor(kind: string, common: string, x: string, a: string) {
    super(kind, common, x);
    this._a = a;
  }
}

export class B extends Abs<number> {
  private readonly _b?: string;

  get b() { return this._b; }

  public constructor(kind: string, common: string, x: number, b: string) {
    super(kind, common, x);
    this._b = b;
  }
}

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
export class JsonRpcError {
  private readonly _code?: number;
  private readonly _data?: any;
  private readonly _message?: string;

  get code() { return this._code; }
  get data() { return this._data; }
  get message() { return this._message; }

  public constructor(code: number, message: string, data: any) {
    this._code = ((code == null) ? -1 : code);
    this._message = ((message == null) ? 'Unknown Error' : message);
    this._data = data;
  }
}

export class ErrorUnknownError extends JsonRpcError {
  public constructor(code: number, message: string, data: any) {
    super(((code == null) ? -1 : code), ((message == null) ? 'Unknown Error' : message), data);
  }
}

export class In1 {
  private readonly _value?: string;

  get value() { return this._value; }

  public constructor(value: string) {
    this._value = value;
  }
}

/**
 * Generic class to describe the JsonRpc request params
 */
export class JsonRpcRequestParams<T> {
  private readonly _param?: T;

  get param() { return this._param; }

  public constructor(param: T) {
    this._param = param;
  }
}

/**
 * Generic class to describe the JsonRpc response package
 */
export class JsonRpcResponse<T extends Abs<any>> {
  private readonly _id?: string;
  private readonly _result?: T;

  get id() { return this._id; }
  get result() { return this._result; }

  public constructor(id: string, result: T) {
    this._id = id;
    this._result = result;
  }

  public get jsonrpc() { return '2.0'; }
}

export class In2 {
  private readonly _value?: string;

  get value() { return this._value; }

  public constructor(value: string) {
    this._value = value;
  }
}

export class GiveIn2GetOut2RequestParams extends JsonRpcRequestParams<In2> {
  public constructor(param: In2) {
    super(param);
  }
}

export class GiveIn2GetOut2Response extends JsonRpcResponse<B> {
  public constructor(id: string, result: B) {
    super(id, result);
  }
}

/**
 * Generic class to describe the JsonRpc request package
 */
export class JsonRpcRequest<TParams extends JsonRpcRequestParams<any>, TMethod extends string> {
  private readonly _id?: string;
  private readonly _method: TMethod;
  private readonly _params?: TParams;

  get id() { return this._id; }
  get method() { return this._method; }
  get params() { return this._params; }

  public constructor(method: TMethod, id: string, params: TParams) {
    this._method = method;
    this._id = id;
    this._params = params;
  }

  public get jsonrpc() { return '2.0'; }
}

export class GiveIn2GetOut2Request extends JsonRpcRequest<GiveIn2GetOut2RequestParams, 'give_in2_get_out2'> {
  public constructor(id: string, params: GiveIn2GetOut2RequestParams) {
    super('give_in2_get_out2', id, params);
  }
}

/**
 * Generic class to describe the JsonRpc error response package
 */
export class JsonRpcErrorResponse {
  private readonly _error: ErrorUnknownError;
  private readonly _id?: string;

  get error() { return this._error; }
  get id() { return this._id; }

  public constructor(error: ErrorUnknownError, id: string) {
    this._error = error;
    this._id = id;
  }

  public get jsonrpc() { return '2.0'; }
}

export class ErrorUnknown extends JsonRpcErrorResponse {
  public constructor(error: ErrorUnknownError, id: string) {
    super(error, id);
  }
}

export class GiveIn1GetOut1RequestParams extends JsonRpcRequestParams<In1> {
  public constructor(param: In1) {
    super(param);
  }
}

export class GiveIn1GetOut1Request extends JsonRpcRequest<GiveIn1GetOut1RequestParams, 'give_in1_get_out1'> {
  public constructor(id: string, params: GiveIn1GetOut1RequestParams) {
    super('give_in1_get_out1', id, params);
  }
}

export class GiveIn1GetOut1Response extends JsonRpcResponse<A> {
  public constructor(id: string, result: A) {
    super(id, result);
  }
}
