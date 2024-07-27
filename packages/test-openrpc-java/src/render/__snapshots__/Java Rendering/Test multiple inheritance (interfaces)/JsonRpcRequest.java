package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public abstract class JsonRpcRequest<TParams extends JsonRpcRequestParams> {
  private final String id;
  private final TParams params;

  public JsonRpcRequest(String id, TParams params) {
    this.id = id;
    this.params = params;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public abstract String getMethod();

  public TParams getParams() {
    return this.params;
  }
}
