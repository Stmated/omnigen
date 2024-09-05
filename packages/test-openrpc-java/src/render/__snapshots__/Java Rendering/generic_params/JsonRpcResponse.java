package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse<T> {
  @JsonProperty(value = "id")
  private final String id;
  @JsonProperty(value = "result", required = true)
  @JsonInclude
  private final T result;

  public JsonRpcResponse(@JsonProperty(value = "id") String id, @JsonProperty(value = "result", required = true) T result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  @JsonProperty(value = "jsonrpc")
  public String getJsonrpc() {
    return "2.0";
  }

  public T getResult() {
    return this.result;
  }
}
