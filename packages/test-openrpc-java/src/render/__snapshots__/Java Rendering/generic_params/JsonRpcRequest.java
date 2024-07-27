package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public abstract class JsonRpcRequest<TParams extends JsonRpcRequestParams<? extends AbstractRequestData<?>>> {
  @JsonProperty(value = "id")
  private final String id;
  @JsonProperty(value = "params")
  private final TParams params;

  public JsonRpcRequest(@JsonProperty(value = "id") String id, @JsonProperty(value = "params") TParams params) {
    this.id = id;
    this.params = params;
  }

  public String getId() {
    return this.id;
  }

  @JsonProperty(value = "jsonrpc")
  public String getJsonrpc() {
    return "2.0";
  }

  public abstract String getMethod();

  public TParams getParams() {
    return this.params;
  }
}
