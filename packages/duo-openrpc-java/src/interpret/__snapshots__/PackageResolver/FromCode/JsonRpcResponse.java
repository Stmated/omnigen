package some.base.pkg;

import some.other.pkg.Thing;

/**
 * Generic class to describe the JsonRpc response package
 */
public class JsonRpcResponse {
  private final String id;
  private final Thing[] result;
  public JsonRpcResponse(String id, Thing[] result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public Thing[] getResult() {
    return this.result;
  }
}
