package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams extends JsonRpcRequestParams> {
  private final String id;
  private final String jsonrpc;
  private final String method;
  private final TParams params;
  public JsonRpcRequest(
    @JsonProperty("jsonrpc") String jsonrpc,
    @JsonProperty(value = "id", required = true) String id,
    @JsonProperty("params") TParams params,
    @JsonProperty("method") String method
  ) {
    if (jsonrpc != null) {
      this.jsonrpc = jsonrpc;
    } else {
      this.jsonrpc = "2.0";
    }
    this.id = id;
    this.params = params;
    this.method = method;
  }

  @JsonInclude(Include.ALWAYS)
  public String getId() {
    return this.id;
  }

  @JsonInclude(Include.ALWAYS)
  public String getJsonrpc() {
    return this.jsonrpc;
  }

  public String getMethod() {
    return this.method;
  }

  public TParams getParams() {
    return this.params;
  }
}
