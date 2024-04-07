package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest {
  private final String id;
  private final GiveInGetOutRequestParams params;

  public GiveInGetOutRequest(GiveInGetOutRequestParams params, String id) {
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
    return "give_in_get_out";
  }

  public GiveInGetOutRequestParams getParams() {
    return this.params;
  }
}
