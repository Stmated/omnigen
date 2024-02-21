package generated.omnigen;

import javax.annotation.Generated;

/**
 * List all things
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsRequest extends JsonRpcRequest {
  private final String id;
  private final String jsonrpc;
  private final ListThingsRequest.ListThingsRequestParams params;
  public ListThingsRequest(ListThingsRequest.ListThingsRequestParams params, String jsonrpc, String id) {
    this.params = params;
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

  public String getMethod() {
    return "list_things";
  }

  public ListThingsRequest.ListThingsRequestParams getParams() {
    return this.params;
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class ListThingsRequestParams extends JsonRpcRequestParams {

  }
}
