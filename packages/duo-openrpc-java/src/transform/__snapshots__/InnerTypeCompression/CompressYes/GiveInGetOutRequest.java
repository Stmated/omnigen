package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest {
  private final String id;
  private final String jsonrpc;
  private final Params params;
  public GiveInGetOutRequest(Params params, String jsonrpc, String id) {
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
    return "give_in_get_out";
  }

  public Params getParams() {
    return this.params;
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class Params extends JsonRpcRequestParams {
    private final In param;
    public Params(In param) {
      this.param = param;
    }

    public In getParam() {
      return this.param;
    }
  }
}
