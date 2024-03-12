package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2Response extends JsonRpcResponse {
  private final String id;
  private final Out2 result;
  public GiveInGetOut2Response(String id, Out2 result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public Out2 getResult() {
    return this.result;
  }
}
