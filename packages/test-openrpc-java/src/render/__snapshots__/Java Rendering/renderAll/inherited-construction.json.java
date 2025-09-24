

package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Method1Request extends JsonRpcRequest<Method1RequestParams> {
  public Method1Request(String id, Method1RequestParams params) {
    super(id, "Method1", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams extends JsonRpcRequestParams<?>> {
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

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams<T> {
  private final T in;

  public JsonRpcRequestParams(T in) {
    this.in = in;
  }

  public T getIn() {
    return this.in;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Method1RequestParams extends JsonRpcRequestParams<In1> {
  public Method1RequestParams(In1 in) {
    super(in);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Object1 extends Base<String> {
  private final String a;

  public Object1(String description, String common, String x, String a) {
    super(description, common, "1", x);
    this.a = a;
  }

  public String getA() {
    return this.a;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class In1 {
  private final Object1 data;

  public In1(Object1 data) {
    this.data = data;
  }

  public Object1 getData() {
    return this.data;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Base<TX> {
  private final String common;
  private final String description;
  private final String kind;
  private final TX x;

  public Base(String description, String common, String kind, TX x) {
    this.description = description;
    this.common = common;
    this.kind = kind;
    this.x = x;
  }

  public String getCommon() {
    return this.common;
  }

  public String getDescription() {
    return this.description;
  }

  public String getKind() {
    return this.kind;
  }

  public TX getX() {
    return this.x;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Out {
  private final boolean success;

  public Out(boolean success) {
    this.success = success;
  }

  public boolean isSuccess() {
    return this.success;
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
public class Method1Response extends JsonRpcResponse {
  public Method1Response(String id, Out result) {
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

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Method2Request extends JsonRpcRequest<Method2RequestParams> {
  public Method2Request(String id, Method2RequestParams params) {
    super(id, "Method2", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Method2RequestParams extends JsonRpcRequestParams<In2> {
  public Method2RequestParams(In2 in) {
    super(in);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Object2 extends Base<Integer> {
  private final String b;

  public Object2(String description, String common, int x, String b) {
    super(description, common, "2", x);
    this.b = b;
  }

  public String getB() {
    return this.b;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class In2 {
  private final Object2 data;

  public In2(Object2 data) {
    this.data = data;
  }

  public Object2 getData() {
    return this.data;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Method2Response extends JsonRpcResponse {
  public Method2Response(String id, Out result) {
    super(id, result);
  }
}
