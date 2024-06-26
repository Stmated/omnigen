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

  public static class Out2 extends A implements IB, IC {
    private final String bar;
    private final String xyz;

    public Out2(String kind, String foo, String bar, String xyz) {
      super(kind, foo);
      this.bar = bar;
      this.xyz = xyz;
    }

    public String getBar() {
      return this.bar;
    }

    public String getXyz() {
      return this.xyz;
    }
  }
}
