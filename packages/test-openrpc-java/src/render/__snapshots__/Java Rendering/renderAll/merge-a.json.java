

package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest {
  private final String id;
  private final ListThingsRequestParams params;

  public JsonRpcRequest(ListThingsRequestParams params, String id) {
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
    return "list_things";
  }

  public ListThingsRequestParams getParams() {
    return this.params;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List all things
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsRequest extends JsonRpcRequest {
  public ListThingsRequest(ListThingsRequestParams params, String id) {
    super(params, id);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse {
  private final String id;
  private final List<Thing> result;

  public JsonRpcResponse(String id, List<Thing> result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public List<Thing> getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * List all things
 * <p>As response: An array of things</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsResponse extends JsonRpcResponse {
  public ListThingsResponse(String id, List<Thing> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Thing {
  private final String id;

  public Thing(String id) {
    this.id = id;
  }

  public String getId() {
    return this.id;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsError100 extends JsonRpcErrorResponse<ListThingsError100Error> {
  public ListThingsError100(String id, ListThingsError100Error error) {
    super(id, error);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcErrorResponse<T extends JsonRpcError> {
  private final T error;
  private final String id;

  public JsonRpcErrorResponse(String id, T error) {
    this.id = id;
    this.error = error;
  }

  public T getError() {
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

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
  private final int code;
  private final Object data;
  private final String message;

  public JsonRpcError(Object data, String message, int code) {
    this.data = data;
    this.message = message;
    this.code = code;
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
public class ListThingsError100Error extends JsonRpcError {
  public ListThingsError100Error(Object data, String message) {
    super(data, ((message == null) ? "Server is busy" : message), 100);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse<ErrorUnknownError> {
  public ErrorUnknown(String id, ErrorUnknownError error) {
    super(id, error);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(Object data, String message, Integer code) {
    super(data, ((message == null) ? "Unknown Error" : message), ((code == null) ? -1 : code));
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SomeTypeA {
  private final String name;

  public SomeTypeA(String name) {
    this.name = name;
  }

  public String getName() {
    return this.name;
  }
}
