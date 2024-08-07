package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutResponse extends JsonRpcResponse {
  private final String id;
  private final Out result;

  public GiveInGetOutResponse(String id, Out result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public Out getResult() {
    return this.result;
  }

  public static class Out {
    private final String result;

    public Out(@JsonProperty(value = "result") String result) {
      this.result = result;
    }

    public String getResult() {
      return this.result;
    }
  }
}
