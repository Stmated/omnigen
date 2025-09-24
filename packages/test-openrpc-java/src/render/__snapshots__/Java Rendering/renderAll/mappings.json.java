

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

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {
  private final Abs param;

  public JsonRpcRequestParams(Abs param) {
    this.param = param;
  }

  public Abs getParam() {
    return this.param;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequestParams extends JsonRpcRequestParams {
  public GiveInGetOutRequestParams(Abs param) {
    super(param);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest {
  private final String id;
  private final GiveInGetOutRequestParams params;

  public JsonRpcRequest(GiveInGetOutRequestParams params, String id) {
    this.params = params;
    this.id = id;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public String getMethod() {
    return "give_in_get_out";
  }

  public GiveInGetOutRequestParams getParams() {
    return this.params;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest {
  public GiveInGetOutRequest(GiveInGetOutRequestParams params, String id) {
    super(params, id);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class B extends Abs {
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
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse {
  private final String id;
  private final Out result;

  public JsonRpcResponse(String id, Out result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public Out getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutResponse extends JsonRpcResponse {
  public GiveInGetOutResponse(String id, Out result) {
    super(id, result);
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
public class Abs2 extends UnionOfAB {
  private final String kind;

  public Abs2(Object raw, String kind) {
    super(raw);
    this.kind = kind;
  }

  public String getKind() {
    return this.kind;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class C extends Abs2 {
  private final String qwe;

  public C(Object raw, String kind, String qwe) {
    super(raw, kind);
    this.qwe = qwe;
  }

  public String getQwe() {
    return this.qwe;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class D extends Abs2 {
  private final String xyz;

  public D(Object raw, String kind, String xyz) {
    super(raw, kind);
    this.xyz = xyz;
  }

  public String getXyz() {
    return this.xyz;
  }
}
