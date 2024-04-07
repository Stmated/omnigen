package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse {
  private final String id;

  public JsonRpcResponse(String id) {
    this.id = id;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }
}
