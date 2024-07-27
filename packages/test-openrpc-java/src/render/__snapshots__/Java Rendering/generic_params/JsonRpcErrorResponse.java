package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcErrorResponse {
  @JsonProperty(value = "error", required = true)
  @JsonInclude
  private final ErrorUnknownError error;
  @JsonProperty(value = "id")
  private final String id;

  public JsonRpcErrorResponse(
    @JsonProperty(value = "error", required = true) ErrorUnknownError error,
    @JsonProperty(value = "id") String id
  ) {
    this.error = error;
    this.id = id;
  }

  public ErrorUnknownError getError() {
    return this.error;
  }

  public String getId() {
    return this.id;
  }

  @JsonProperty(value = "jsonrpc")
  public String getJsonrpc() {
    return "2.0";
  }
}
