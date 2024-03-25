package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List all things
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsRequest extends JsonRpcRequest {
  private final String id;
  private final Params params;
  public ListThingsRequest(Params params, String id) {
    this.params = params;
    this.id = id;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public String getMethod() {
    return "list_things";
  }

  public Params getParams() {
    return this.params;
  }

  public static class Params extends JsonRpcRequestParams {

  }
}
