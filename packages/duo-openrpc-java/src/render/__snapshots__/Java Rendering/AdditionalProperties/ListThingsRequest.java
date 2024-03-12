package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List all things
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsRequest extends JsonRpcRequest {
  public ListThingsRequest(ListThingsRequestParams params, String jsonrpc, String id) {
    super(params, ((jsonrpc == null) ? "2.0" : jsonrpc), id);
  }
}
