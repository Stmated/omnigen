

package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest<GiveInGetOutRequestParams> {
  public GiveInGetOutRequest(String id, GiveInGetOutRequestParams params) {
    super(id, "give_in_get_out", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams extends JsonRpcRequestParams> {
  private final String id;
  private final String method;
  private final TParams params;

  public JsonRpcRequest(String id, String method, TParams params) {
    this.id = id;
    this.method = method;
    this.params = params;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public String getMethod() {
    return this.method;
  }

  public TParams getParams() {
    return this.params;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.function.Function;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class UnionOfAB {
  private final Object _raw;
  private A _a;
  private B _b;

  public UnionOfAB(Object raw) {
    this._raw = raw;
  }

  public A getA(Function<Object, A> transformer) {
    if (this._a != null) {
      return this._a;
    }
    return this._a = transformer.apply(this._raw);
  }

  public B getB(Function<Object, B> transformer) {
    if (this._b != null) {
      return this._b;
    }
    return this._b = transformer.apply(this._raw);
  }

  public Object getRaw() {
    return this._raw;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class In extends UnionOfAB {
  private final String inType;

  public In(Object raw, String inType) {
    super(raw);
    this.inType = inType;
  }

  public String getInType() {
    return this.inType;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {
  private final In param;

  public JsonRpcRequestParams(In param) {
    this.param = param;
  }

  public In getParam() {
    return this.param;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Abs {
  private final String kind;

  public Abs(String kind) {
    this.kind = kind;
  }

  public String getKind() {
    return this.kind;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class A extends Abs {
  private final String foo;

  public A(String kind, String foo) {
    super(kind);
    this.foo = foo;
  }

  public String getFoo() {
    return this.foo;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public interface IB {
  String getBar();
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class B extends Abs implements IB {
  private final String bar;

  public B(String kind, String bar) {
    super(kind);
    this.bar = bar;
  }

  public String getBar() {
    return this.bar;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequestParams extends JsonRpcRequestParams {
  public GiveInGetOutRequestParams(In param) {
    super(param);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutResponse extends JsonRpcResponse<Out> {
  public GiveInGetOutResponse(String id, Out result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse<T> {
  private final String id;
  private final T result;

  public JsonRpcResponse(String id, T result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public T getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Out {
  private final String result;

  public Out(String result) {
    this.result = result;
  }

  public String getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
  private final int code;
  private final Object data;
  private final String message;

  public JsonRpcError(Integer code, String message, Object data) {
    this.code = ((code == null) ? -1 : code);
    this.message = ((message == null) ? "Unknown Error" : message);
    this.data = data;
  }

  public int getCode() {
    return this.code;
  }

  public Object getData() {
    return this.data;
  }

  public String getMessage() {
    return this.message;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(Integer code, String message, Object data) {
    super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), data);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcErrorResponse {
  private final ErrorUnknownError error;
  private final String id;

  public JsonRpcErrorResponse(ErrorUnknownError error, String id) {
    this.error = error;
    this.id = id;
  }

  public ErrorUnknownError getError() {
    return this.error;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse {
  public ErrorUnknown(ErrorUnknownError error, String id) {
    super(error, id);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2Request extends JsonRpcRequest<GiveInGetOut2RequestParams> {
  public GiveInGetOut2Request(String id, GiveInGetOut2RequestParams params) {
    super(id, "give_in_get_out2", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2RequestParams extends JsonRpcRequestParams {
  public GiveInGetOut2RequestParams(In param) {
    super(param);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2Response extends JsonRpcResponse<Out2> {
  public GiveInGetOut2Response(String id, Out2 result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public interface IC {
  String getXyz();
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Out2 extends A implements IB, IC {
  private final String bar;
  private final String xyz;

  public Out2(String kind, String foo, String bar, String xyz) {
    super(kind, foo);
    this.bar = bar;
    this.xyz = xyz;
  }

  public String getBar() {
    return this.bar;
  }

  public String getXyz() {
    return this.xyz;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class C extends Abs implements IC {
  private final String xyz;

  public C(String kind, String xyz) {
    super(kind);
    this.xyz = xyz;
  }

  public String getXyz() {
    return this.xyz;
  }
}
