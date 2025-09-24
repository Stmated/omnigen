

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
public class ListElementsRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest {
  private final String id;
  private final ListElementsRequestParams params;

  public JsonRpcRequest(ListElementsRequestParams params, String id) {
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
    return "list_elements";
  }

  public ListElementsRequestParams getParams() {
    return this.params;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List all elements
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListElementsRequest extends JsonRpcRequest {
  public ListElementsRequest(ListElementsRequestParams params, String id) {
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
  private final List<Element> result;

  public JsonRpcResponse(String id, List<Element> result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public List<Element> getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * List all elements
 * <p>As response: An array of elements</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListElementsResponse extends JsonRpcResponse {
  public ListElementsResponse(String id, List<Element> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Element {
  private final String id;

  public Element(String id) {
    this.id = id;
  }

  public String getId() {
    return this.id;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListElementsError100 extends JsonRpcErrorResponse<ListElementsError100Error> {
  public ListElementsError100(String id, ListElementsError100Error error) {
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
public class ListElementsError100Error extends JsonRpcError {
  public ListElementsError100Error(Object data, String message) {
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
public class SomeTypeB {
  private final String name;

  public SomeTypeB(String name) {
    this.name = name;
  }

  public String getName() {
    return this.name;
  }
}
