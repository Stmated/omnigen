package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class RefundResponse extends JsonRpcResponse<RefundResponse.Result> {
  public RefundResponse(@JsonProperty(value = "id") String id, @JsonProperty(value = "result") Result result) {
    super(id, result);
  }

  public static class Result {
    @JsonProperty(value = "data")
    private final Data data;
    @JsonProperty(value = "method")
    private final String method;
    @JsonProperty(value = "signature")
    private final String signature;
    @JsonProperty(value = "uuid")
    private final String uuid;

    public Result(
      @JsonProperty(value = "signature") String signature,
      @JsonProperty(value = "uuid") String uuid,
      @JsonProperty(value = "method") String method,
      @JsonProperty(value = "data") Data data
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
      @JsonProperty(value = "orderid")
      private final String orderid;
      @JsonProperty(value = "result", required = true)
      @JsonInclude
      private final String result;

      public Data(
        @JsonProperty(value = "orderid") String orderid,
        @JsonProperty(value = "result", required = true) String result
      ) {
        this.orderid = orderid;
        this.result = result;
      }

      public String getOrderid() {
        return this.orderid;
      }

      public String getResult() {
        return this.result;
      }
    }
  }
}
