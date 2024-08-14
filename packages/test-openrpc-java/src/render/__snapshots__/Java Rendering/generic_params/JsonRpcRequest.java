package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams extends JsonRpcRequestParams<? extends AbstractRequestData<?>>> {
  @JsonProperty(value = "id")
  private final String id;
  @JsonProperty(value = "method", required = true)
  @JsonInclude
  private final String method;
  @JsonProperty(value = "params")
  private final TParams params;

  public JsonRpcRequest(
    @JsonProperty(value = "id") String id,
    @JsonProperty(value = "method", required = true) String method,
    @JsonProperty(value = "params") TParams params
  ) {
    this.id = id;
    this.method = method;
    this.params = params;
  }

  public String getId() {
    return this.id;
  }

  @JsonProperty(value = "jsonrpc")
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
