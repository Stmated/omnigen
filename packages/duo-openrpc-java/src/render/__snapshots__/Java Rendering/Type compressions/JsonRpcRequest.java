package generated.omnigen;

import javax.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest {
  private final String id;
  private final String jsonrpc;
  public JsonRpcRequest(String jsonrpc, String id) {
    if (jsonrpc != null) {
      this.jsonrpc = jsonrpc;
    } else {
      this.jsonrpc = "2.0";
    }
    this.id = id;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return this.jsonrpc;
  }

  public String getMethod();
}
