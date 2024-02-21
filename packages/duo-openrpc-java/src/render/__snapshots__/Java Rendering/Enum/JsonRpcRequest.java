package generated.omnigen;

/**
 * Generic class to describe the JsonRpc request package
 */
public class JsonRpcRequest {
  private final String id;
  private final String jsonrpc;
  private final ListThingsRequestParams params;
  public JsonRpcRequest(ListThingsRequestParams params, String jsonrpc, String id) {
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

  public ListThingsRequestParams getParams() {
    return this.params;
  }
}
