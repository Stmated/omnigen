package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
public class JsonRpcError {
  private final int code;
  private final JsonNode data;
  private final String message;
  public JsonRpcError(JsonNode data, int code, String message) {
    this.data = data;
    this.code = code;
    this.message = message;
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
