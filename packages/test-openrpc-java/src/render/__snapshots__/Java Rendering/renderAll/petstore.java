

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
public class ListPetsRequestParams extends JsonRpcRequestParams {
  private final int limit;

  public ListPetsRequestParams(int limit) {
    this.limit = limit;
  }

  /**
   * <section>
   *   <h2>listPetExample</h2>
   *   <ul>
   *     <li>{@code 1}</li>
   *     <li>{@code [{"id":7,"name":"fluffy","tag":"poodle"}]}</li>
   *   </ul>
   * </section>
   */
  public int getLimit() {
    return this.limit;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * A paged array of pets
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

/**
 * <section>
 *   <h2>getPetExample</h2>
 *   <ul>
 *     <li>{@code 7}</li>
 *     <li>{@code {
 *     "name": "fluffy",
 *     "tag": "poodle",
 *     "id": 7
 *   }}</li>
 *   </ul>
 * </section>
 */
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

  /**
   * <section>
   *   <h2>createPetExample</h2>
   *   <ul>
   *     <li>{@code "fluffy"}</li>
   *     <li>{@code "poodle"}</li>
   *     <li>{@code 7}</li>
   *   </ul>
   * </section>
   * <section>
   *   <h2>getPetExample</h2>
   *   <ul>
   *     <li>{@code 7}</li>
   *     <li>{@code {"name":"fluffy","tag":"poodle","id":7}}</li>
   *   </ul>
   * </section>
   */
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

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListPetsError100 extends JsonRpcErrorResponse<ListPetsError100Error> {
  public ListPetsError100(String id, ListPetsError100Error error) {
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
public class ListPetsError100Error extends JsonRpcError {
  public ListPetsError100Error(Object data, String message) {
    super(data, ((message == null) ? "pets busy" : message), 100);
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
  private final String newPetName;
  private final String newPetTag;

  public CreatePetRequestParams(String newPetName, String newPetTag) {
    this.newPetName = newPetName;
    this.newPetTag = newPetTag;
  }

  /**
   * <section>
   *   <h2>createPetExample</h2>
   *   <ul>
   *     <li>{@code "fluffy"}</li>
   *     <li>{@code "poodle"}</li>
   *     <li>{@code 7}</li>
   *   </ul>
   * </section>
   */
  public String getNewPetName() {
    return this.newPetName;
  }

  /**
   * <section>
   *   <h2>createPetExample</h2>
   *   <ul>
   *     <li>{@code "fluffy"}</li>
   *     <li>{@code "poodle"}</li>
   *     <li>{@code 7}</li>
   *   </ul>
   * </section>
   */
  public String getNewPetTag() {
    return this.newPetTag;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * The id of the pet to retrieve
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CreatePetResponse extends JsonRpcResponse<Integer> {
  public CreatePetResponse(String id, int result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Info for a specific pet
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetRequest extends JsonRpcRequest<GetPetRequestParams> {
  public GetPetRequest(String id, GetPetRequestParams params) {
    super(id, "get_pet", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetRequestParams extends JsonRpcRequestParams {
  private final int petId;

  public GetPetRequestParams(int petId) {
    this.petId = petId;
  }

  /**
   * <section>
   *   <h2>createPetExample</h2>
   *   <ul>
   *     <li>{@code "fluffy"}</li>
   *     <li>{@code "poodle"}</li>
   *     <li>{@code 7}</li>
   *   </ul>
   * </section>
   * <section>
   *   <h2>getPetExample</h2>
   *   <ul>
   *     <li>{@code 7}</li>
   *     <li>{@code {"name":"fluffy","tag":"poodle","id":7}}</li>
   *   </ul>
   * </section>
   */
  public int getPetId() {
    return this.petId;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Expected response to a valid request
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetResponse extends JsonRpcResponse<Pet> {
  public GetPetResponse(String id, Pet result) {
    super(id, result);
  }
}
