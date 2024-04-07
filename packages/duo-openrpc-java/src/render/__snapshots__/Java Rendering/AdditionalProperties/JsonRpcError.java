package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
  private final Integer code;
  private final JsonNode data;
  private final String message;

  public JsonRpcError(Integer code, String message, JsonNode data) {
    this.code = ((code == null) ? -1 : code);
    this.message = ((message == null) ? "Unknown Error" : message);
    this.data = data;
  }

  public Integer getCode() {
    return this.code;
  }

  public JsonNode getData() {
    return this.data;
  }

  public String getMessage() {
    return this.message;
  }
}
