package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class RefundRequest extends JsonRpcRequest<RefundRequest.RefundRequestParams> {
  public RefundRequest(
    @JsonProperty(value = "jsonrpc", required = true) String jsonrpc,
    @JsonProperty(value = "id", required = true) String id,
    @JsonProperty("params") RefundRequest.RefundRequestParams params
  ) {
    super(((jsonrpc == null) ? "2.0" : jsonrpc), id, params, "Refund");
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class RefundRequestParams extends JsonRpcRequestParams<RefundRequest.RefundRequestParams.RefundRequestData> {
    public RefundRequestParams(
      @JsonProperty(value = "Signature", required = true) String signature,
      @JsonProperty(value = "UUID", required = true) String uuid,
      @JsonProperty("Data") RefundRequest.RefundRequestParams.RefundRequestData data
    ) {
      super(signature, uuid, data);
    }

    @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
    public static class RefundRequestData extends AbstractRequestData<RefundRequest.RefundRequestParams.RefundRequestData.RefundRequestDataAttributes> {
      private final String amount;
      private final String currency;
      private final String orderId;
      public RefundRequestData(
        @JsonProperty(value = "Username", required = true) String username,
        @JsonProperty(value = "Password", required = true) String password,
        @JsonProperty("Attributes") RefundRequest.RefundRequestParams.RefundRequestData.RefundRequestDataAttributes attributes,
        @JsonProperty(value = "OrderID", required = true) String orderId,
        @JsonProperty(value = "Amount", required = true) String amount,
        @JsonProperty(value = "Currency", required = true) String currency
      ) {
        super(username, password, attributes);
        this.orderId = orderId;
        this.amount = amount;
        this.currency = currency;
      }

      @JsonProperty(value = "Amount", required = true)
      @JsonInclude(Include.ALWAYS)
      public String getAmount() {
        return this.amount;
      }

      @JsonProperty(value = "Currency", required = true)
      @JsonInclude(Include.ALWAYS)
      public String getCurrency() {
        return this.currency;
      }

      @JsonProperty(value = "OrderID", required = true)
      @JsonInclude(Include.ALWAYS)
      public String getOrderId() {
        return this.orderId;
      }

      @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
      public static class RefundRequestDataAttributes {
        private final String externalReference;
        public RefundRequestDataAttributes(@JsonProperty("ExternalReference") String externalReference) {
          this.externalReference = externalReference;
        }

        @JsonProperty("ExternalReference")
        public String getExternalReference() {
          return this.externalReference;
        }
      }
    }
  }
}
