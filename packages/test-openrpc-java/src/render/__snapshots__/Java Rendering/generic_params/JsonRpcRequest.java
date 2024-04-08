package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams extends JsonRpcRequestParams<? extends AbstractRequestData<?>>> {
  private final String id;
  private final String method;
  private final TParams params;

  public JsonRpcRequest(
    @JsonProperty(value = "id", required = true) String id,
    @JsonProperty("params") TParams params,
    @JsonProperty(value = "method", required = true) String method
  ) {
    this.id = id;
    this.params = params;
    this.method = method;
  }

  @JsonInclude(Include.ALWAYS)
  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  @JsonInclude(Include.ALWAYS)
  public String getMethod() {
    return this.method;
  }

  public TParams getParams() {
    return this.params;
  }
}
