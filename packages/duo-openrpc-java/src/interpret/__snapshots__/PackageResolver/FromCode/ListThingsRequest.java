package some.other.pkg;

import some.base.pkg.JsonRpcRequest;

/**
 * List all things
 */
public class ListThingsRequest extends JsonRpcRequest {
  public ListThingsRequest(ListThingsRequestParams params, String id) {
    super(params, id);
  }
}
