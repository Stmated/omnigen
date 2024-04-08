package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2Request extends JsonRpcRequest {
  private final String id;
  private final Params params;

  public GiveInGetOut2Request(Params params, String id) {
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
    return "give_in_get_out2";
  }

  public Params getParams() {
    return this.params;
  }

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
