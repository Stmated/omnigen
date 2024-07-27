package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
  @JsonProperty(value = "code")
  private final int code;
  @JsonProperty(value = "data")
  private final JsonNode data;
  @JsonProperty(value = "message")
  private final String message;

  public JsonRpcError(
    @JsonProperty(value = "code") Integer code,
    @JsonProperty(value = "message") String message,
    @JsonProperty(value = "data") JsonNode data
  ) {
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
