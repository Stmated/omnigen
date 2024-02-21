package some.other.pkg;

import some.base.pkg.JsonRpcResponse;

/**
 * List all things
 * <p>As response: An array of things</p>
 */
public class ListThingsResponse extends JsonRpcResponse {
  public ListThingsResponse(String id, Thing[] result) {
    super(id, result);
  }
}
