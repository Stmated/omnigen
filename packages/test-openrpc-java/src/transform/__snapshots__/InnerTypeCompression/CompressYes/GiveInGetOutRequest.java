package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest {
  private final String id;
  private final Params params;

  public GiveInGetOutRequest(Params params, String id) {
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

  public Params getParams() {
    return this.params;
  }

  public static class Params extends JsonRpcRequestParams {
    private final In param;

    public Params(@JsonProperty(value = "param") In param) {
      this.param = param;
    }

    public In getParam() {
      return this.param;
    }
  }
}
