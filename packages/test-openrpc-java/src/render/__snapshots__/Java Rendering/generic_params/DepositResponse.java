package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DepositResponse extends JsonRpcResponse<DepositResponse.Result> {
  public DepositResponse(@JsonProperty("id") String id, @JsonProperty("result") Result result) {
    super(id, result);
  }

  public static class Result {
    private final Data data;
    private final String method;
    private final String signature;
    private final String uuid;

    public Result(
      @JsonProperty("signature") String signature,
      @JsonProperty("uuid") String uuid,
      @JsonProperty("method") String method,
      @JsonProperty("data") Data data
    ) {
      this.signature = signature;
      this.uuid = uuid;
      this.method = method;
      this.data = data;
    }

    public Data getData() {
      return this.data;
    }

    public String getMethod() {
      return this.method;
    }

    public String getSignature() {
      return this.signature;
    }

    public String getUuid() {
      return this.uuid;
    }

    public static class Data {
      private final String orderid;
      private final String url;

      public Data(@JsonProperty("orderid") String orderid, @JsonProperty("url") String url) {
        this.orderid = orderid;
        this.url = url;
      }

      public String getOrderid() {
        return this.orderid;
      }

      public String getUrl() {
        return this.url;
      }
    }
  }
}
