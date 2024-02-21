package generated.omnigen;

import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutResponse extends JsonRpcResponse {
  private final String id;
  private final GiveInGetOutResponse.Out result;
  public GiveInGetOutResponse(String id, GiveInGetOutResponse.Out result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public GiveInGetOutResponse.Out getResult() {
    return this.result;
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class Out {
    private final String result;
    public Out(String result) {
      this.result = result;
    }

    public String getResult() {
      return this.result;
    }
  }
}
