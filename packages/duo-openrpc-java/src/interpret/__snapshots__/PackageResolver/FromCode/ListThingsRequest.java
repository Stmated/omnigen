package some.other.pkg;

import some.base.pkg.JsonRpcRequest;

/**
 * List all things
 */
public class ListThingsRequest extends JsonRpcRequest {
  public ListThingsRequest(ListThingsRequestParams params, String jsonrpc, String id) {
    super(params, ((jsonrpc == null) ? "2.0" : jsonrpc), id);
  }
}
