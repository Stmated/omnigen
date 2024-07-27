package some.base.pkg;

import java.util.List;
import some.other.pkg.Thing;

/**
 * Generic class to describe the JsonRpc response package
 */
public class JsonRpcResponse {
  private final String id;
  private final List<Thing> result;

  public JsonRpcResponse(String id, List<Thing> result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public List<Thing> getResult() {
    return this.result;
  }
}
