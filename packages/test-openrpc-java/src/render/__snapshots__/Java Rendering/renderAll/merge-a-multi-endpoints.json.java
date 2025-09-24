

package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List all things
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsRequest extends JsonRpcRequest<ListThingsRequestParams> {
  public ListThingsRequest(String id, ListThingsRequestParams params) {
    super(id, "list_things", params);
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
import java.util.List;

/**
 * List all things
 * <p>As response: An array of things</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsResponse extends JsonRpcResponse<List<Thing>> {
  public ListThingsResponse(String id, List<Thing> result) {
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

/**
 * Save the thing
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SaveThingRequest extends JsonRpcRequest<SaveThingRequestParams> {
  public SaveThingRequest(String id, SaveThingRequestParams params) {
    super(id, "save_thing", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SaveThingRequestParams extends JsonRpcRequestParams {
  private final Thing thing;

  public SaveThingRequestParams(Thing thing) {
    this.thing = thing;
  }

  public Thing getThing() {
    return this.thing;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Save the thing
 * <p>As response: Saves a thing and gives back the id</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SaveThingResponse extends JsonRpcResponse<Long> {
  public SaveThingResponse(String id, long result) {
    super(id, result);
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
