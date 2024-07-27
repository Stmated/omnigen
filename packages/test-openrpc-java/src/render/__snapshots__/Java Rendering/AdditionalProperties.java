package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.Generated;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
@SuppressWarnings("unused")
public class AdditionalProperties {
  public static class ErrorUnknown extends JsonRpcErrorResponse {
    public ErrorUnknown(ErrorUnknownError error, String id) {
      super(error, id);
    }
  }

  public static class ErrorUnknownError extends JsonRpcError {
    public ErrorUnknownError(Integer code, String message, JsonNode data) {
      super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), data);
    }
  }

  /**
   * Generic class to describe the JsonRpc error inside an error response
   */
  public static class JsonRpcError {
    private final int code;
    private final JsonNode data;
    private final String message;

    public JsonRpcError(Integer code, String message, JsonNode data) {
      this.code = ((code == null) ? -1 : code);
      this.message = ((message == null) ? "Unknown Error" : message);
      this.data = data;
    }

    public int getCode() {
      return this.code;
    }

    public JsonNode getData() {
      return this.data;
    }

    public String getMessage() {
      return this.message;
    }
  }

  /**
   * Generic class to describe the JsonRpc error response package
   */
  public static class JsonRpcErrorResponse {
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

  /**
   * Generic class to describe the JsonRpc request package
   */
  public static class JsonRpcRequest {
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

  /**
   * Generic class to describe the JsonRpc request params
   */
  public static class JsonRpcRequestParams {

  }

  /**
   * Generic class to describe the JsonRpc response package
   */
  public static class JsonRpcResponse {
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

  /**
   * List all things
   */
  public static class ListThingsRequest extends JsonRpcRequest {
    public ListThingsRequest(ListThingsRequestParams params, String id) {
      super(params, id);
    }
  }

  public static class ListThingsRequestParams extends JsonRpcRequestParams {

  }

  /**
   * List all things
   * <p>As response: An array of things</p>
   */
  public static class ListThingsResponse extends JsonRpcResponse {
    public ListThingsResponse(String id, List<Thing> result) {
      super(id, result);
    }
  }

  public static class Thing implements IAdditionalProperties {
    private final String id;
    @JsonAnySetter
    private Map<String, Object> additionalProperties = new HashMap<>();

    public Thing(@JsonProperty(value = "id", required = true) String id) {
      this.id = id;
    }

    public void addAdditionalProperty(String key, Object value) {
      this.additionalProperties.put(key, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getAdditionalProperties() {
      return this.additionalProperties;
    }

    public String getId() {
      return this.id;
    }
  }

  public interface IAdditionalProperties {
    Map<String, Object> getAdditionalProperties();
  }
}
