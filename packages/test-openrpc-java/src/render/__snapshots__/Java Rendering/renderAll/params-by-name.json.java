

package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List all pets
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListPetsRequest extends JsonRpcRequest<ListPetsRequestParams> {
  public ListPetsRequest(String id, ListPetsRequestParams params) {
    super(id, "list_pets", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams> {
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
public class ListPetsRequestParams extends JsonRpcRequestParams {
  private final int limit;

  public ListPetsRequestParams(int limit) {
    this.limit = limit;
  }

  /**
   * <hr />
   * <strong>Example #1</strong> - List pet example
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link ListPetsRequestParams#limit}</dt>
   *     <dd>1</dd>
   *   </dl>
   *   </p>
   * <p>
   *   <p><strong>📤 Response</strong> - listPetResultExample
   *   <pre>{@code [
   *     {
   *       "id": 7,
   *       "name": "fluffy",
   *       "tag": "poodle"
   *     }
   *   ]}</pre>
   *   </p>
   */
  public int getLimit() {
    return this.limit;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * List all pets
 * <p>As response: A paged array of pets</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListPetsResponse extends JsonRpcResponse<List<Pet>> {
  public ListPetsResponse(String id, List<Pet> result) {
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
public class Pet {
  private final int id;
  private final String name;
  private final String tag;

  public Pet(int id, String name, String tag) {
    this.id = id;
    this.name = name;
    this.tag = tag;
  }

  public int getId() {
    return this.id;
  }

  public String getName() {
    return this.name;
  }

  public String getTag() {
    return this.tag;
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
 * Create a pet
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CreatePetRequest extends JsonRpcRequest<CreatePetRequestParams> {
  public CreatePetRequest(String id, CreatePetRequestParams params) {
    super(id, "create_pet", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CreatePetRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Create a pet
 * <p>As response: Null response</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CreatePetResponse extends JsonRpcResponse<Object> {
  public CreatePetResponse(String id, Object result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Info for a specific pet
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetRequest extends JsonRpcRequest<PositionalOfPetId> {
  public GetPetRequest(String id, PositionalOfPetId params) {
    super(id, "get_pet", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Info for a specific pet
 * <p>As response: Expected response to a valid request</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetResponse extends JsonRpcResponse<Pet> {
  public GetPetResponse(String id, Pet result) {
    super(id, result);
  }
}
