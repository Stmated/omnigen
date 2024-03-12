package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class RefundResponse extends JsonRpcResponse<RefundResponse.RefundDepositResponseObject> {
  public RefundResponse(
    @JsonProperty("id") String id,
    @JsonProperty("result") RefundResponse.RefundDepositResponseObject result
  ) {
    super(id, result);
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class RefundDepositResponseObject {
    private final RefundResponse.RefundDepositResponseObject.RefundResponseData data;
    private final String method;
    private final String signature;
    private final String uuid;
    public RefundDepositResponseObject(
      @JsonProperty("signature") String signature,
      @JsonProperty("uuid") String uuid,
      @JsonProperty("method") String method,
      @JsonProperty("data") RefundResponse.RefundDepositResponseObject.RefundResponseData data
    ) {
      this.signature = signature;
      this.uuid = uuid;
      this.method = method;
      this.data = data;
    }

    public RefundResponse.RefundDepositResponseObject.RefundResponseData getData() {
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

    @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
    public static class RefundResponseData {
      private final String orderid;
      private final String result;
      public RefundResponseData(
        @JsonProperty("orderid") String orderid,
        @JsonProperty(value = "result", required = true) String result
      ) {
        this.orderid = orderid;
        this.result = result;
      }

      public String getOrderid() {
        return this.orderid;
      }

      @JsonProperty(required = true)
      @JsonInclude(Include.ALWAYS)
      public String getResult() {
        return this.result;
      }
    }
  }
}
