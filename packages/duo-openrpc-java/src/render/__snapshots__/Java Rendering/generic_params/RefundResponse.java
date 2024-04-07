package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class RefundResponse extends JsonRpcResponse<RefundResponse.RefundDepositResponseObject> {
  public RefundResponse(@JsonProperty("id") String id, @JsonProperty("result") RefundDepositResponseObject result) {
    super(id, result);
  }

  public static class RefundDepositResponseObject {
    private final Data data;
    private final String method;
    private final String signature;
    private final String uuid;

    public RefundDepositResponseObject(
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
      private final String result;

      public Data(
        @JsonProperty("orderid") String orderid,
        @JsonProperty(value = "result", required = true) String result
      ) {
        this.orderid = orderid;
        this.result = result;
      }

      public String getOrderid() {
        return this.orderid;
      }

      @JsonInclude(Include.ALWAYS)
      public String getResult() {
        return this.result;
      }
    }
  }
}
