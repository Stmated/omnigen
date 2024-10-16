package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class RefundRequest extends JsonRpcRequest<RefundRequest.Params> {
  public RefundRequest(@JsonProperty(value = "id") String id, @JsonProperty(value = "params") Params params) {
    super(id, "Refund", params);
  }

  public static class Params extends JsonRpcRequestParams<Params.Data> {
    public Params(
      @JsonProperty(value = "Signature", required = true) String signature,
      @JsonProperty(value = "UUID", required = true) String uuid,
      @JsonProperty(value = "Data", required = true) Data data
    ) {
      super(signature, uuid, data);
    }

    public static class Data extends AbstractRequestData<Data.Attributes> {
      @JsonProperty(value = "Amount", required = true)
      @JsonInclude
      private final String amount;
      @JsonProperty(value = "Currency", required = true)
      @JsonInclude
      private final String currency;
      @JsonProperty(value = "OrderID", required = true)
      @JsonInclude
      private final String orderId;

      public Data(
        @JsonProperty(value = "Username", required = true) String username,
        @JsonProperty(value = "Password", required = true) String password,
        @JsonProperty(value = "Attributes", required = true) Attributes attributes,
        @JsonProperty(value = "OrderID", required = true) String orderId,
        @JsonProperty(value = "Amount", required = true) String amount,
        @JsonProperty(value = "Currency", required = true) String currency
      ) {
        super(username, password, attributes);
        this.orderId = orderId;
        this.amount = amount;
        this.currency = currency;
      }

      public String getAmount() {
        return this.amount;
      }

      public String getCurrency() {
        return this.currency;
      }

      public String getOrderID() {
        return this.orderId;
      }

      public static class Attributes {
        @JsonProperty(value = "ExternalReference")
        private final String externalReference;

        public Attributes(@JsonProperty(value = "ExternalReference") String externalReference) {
          this.externalReference = externalReference;
        }

        public String getExternalReference() {
          return this.externalReference;
        }
      }
    }
  }
}
