package generated.omnigen;

import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2Request extends JsonRpcRequest {
  private final String id;
  private final String jsonrpc;
  private final GiveInGetOut2Request.GiveInGetOut2RequestParams params;
  public GiveInGetOut2Request(GiveInGetOut2Request.GiveInGetOut2RequestParams params, String jsonrpc, String id) {
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
    return "give_in_get_out2";
  }

  public GiveInGetOut2Request.GiveInGetOut2RequestParams getParams() {
    return this.params;
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class GiveInGetOut2RequestParams extends JsonRpcRequestParams {
    private final In param;
    public GiveInGetOut2RequestParams(In param) {
      this.param = param;
    }

    public In getParam() {
      return this.param;
    }
  }
}
