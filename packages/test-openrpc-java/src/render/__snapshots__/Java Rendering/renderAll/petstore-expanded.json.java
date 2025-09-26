

package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns all pets from the system that the user has access to
 * Nam sed condimentum est. Maecenas tempor sagittis sapien, nec rhoncus sem sagittis sit amet. Aenean at gravida augue, ac iaculis sem. Curabitur odio lorem, ornare eget elementum nec, cursus id lectus. Duis mi turpis, pulvinar ac eros ac, tincidunt varius justo. In hac habitasse platea dictumst. Integer at adipiscing ante, a sagittis ligula. Aenean pharetra tempor ante molestie imperdiet. Vivamus id aliquam diam.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetsRequest extends JsonRpcRequest<GetPetsRequestParams> {
  public GetPetsRequest(String id, GetPetsRequestParams params) {
    super(id, "get_pets", params);
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
import java.util.List;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetsRequestParams extends JsonRpcRequestParams {
  private final int limit;
  private final List<String> tags;

  public GetPetsRequestParams(List<String> tags, int limit) {
    this.tags = tags;
    this.limit = limit;
  }

  public int getLimit() {
    return this.limit;
  }

  public List<String> getTags() {
    return this.tags;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * Returns all pets from the system that the user has access to
 * Nam sed condimentum est. Maecenas tempor sagittis sapien, nec rhoncus sem sagittis sit amet. Aenean at gravida augue, ac iaculis sem. Curabitur odio lorem, ornare eget elementum nec, cursus id lectus. Duis mi turpis, pulvinar ac eros ac, tincidunt varius justo. In hac habitasse platea dictumst. Integer at adipiscing ante, a sagittis ligula. Aenean pharetra tempor ante molestie imperdiet. Vivamus id aliquam diam.
 * <p>As response: pet response</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetsResponse extends JsonRpcResponse<List<Pet>> {
  public GetPetsResponse(String id, List<Pet> result) {
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
public class NewPet {
  private final String name;
  private final String tag;
  private Integer id;

  public NewPet(String name, String tag, Integer id) {
    this.name = name;
    this.tag = tag;
    this.id = id;
  }

  public Integer getId() {
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
public class Pet extends NewPet {
  public Pet(String name, String tag, Integer id) {
    super(name, tag, id);
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
 * Creates a new pet in the store.  Duplicates are allowed
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
  private final NewPet newPet;

  public CreatePetRequestParams(NewPet newPet) {
    this.newPet = newPet;
  }

  public NewPet getNewPet() {
    return this.newPet;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates a new pet in the store.  Duplicates are allowed
 * <p>As response: the newly created pet</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CreatePetResponse extends JsonRpcResponse<Pet> {
  public CreatePetResponse(String id, Pet result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns a user based on a single ID, if the user does not have access to the pet
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetByIdRequest extends JsonRpcRequest<GetPetByIdRequestParams> {
  public GetPetByIdRequest(String id, GetPetByIdRequestParams params) {
    super(id, "get_pet_by_id", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetByIdRequestParams extends JsonRpcRequestParams {
  private final int id;

  public GetPetByIdRequestParams(int id) {
    this.id = id;
  }

  public int getId() {
    return this.id;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns a user based on a single ID, if the user does not have access to the pet
 * <p>As response: pet response</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPetByIdResponse extends JsonRpcResponse<Pet> {
  public GetPetByIdResponse(String id, Pet result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * deletes a single pet based on the ID supplied
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DeletePetByIdRequest extends JsonRpcRequest<DeletePetByIdRequestParams> {
  public DeletePetByIdRequest(String id, DeletePetByIdRequestParams params) {
    super(id, "delete_pet_by_id", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DeletePetByIdRequestParams extends JsonRpcRequestParams {
  private final int id;

  public DeletePetByIdRequestParams(int id) {
    this.id = id;
  }

  public int getId() {
    return this.id;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * deletes a single pet based on the ID supplied
 * <p>As response: pet deleted</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DeletePetByIdResponse extends JsonRpcResponse<Object> {
  public DeletePetByIdResponse(String id, Object result) {
    super(id, result);
  }
}
