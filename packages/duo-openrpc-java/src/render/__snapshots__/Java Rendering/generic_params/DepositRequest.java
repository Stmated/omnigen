package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DepositRequest extends JsonRpcRequest<DepositRequest.Params> {
  public DepositRequest(@JsonProperty(value = "id", required = true) String id, @JsonProperty("params") Params params) {
    super(id, params, "Deposit");
  }

  public static class Params extends JsonRpcRequestParams<Params.Data> {
    public Params(
      @JsonProperty(value = "Signature", required = true) String signature,
      @JsonProperty(value = "UUID", required = true) String uuid,
      @JsonProperty("Data") Data data
    ) {
      super(signature, uuid, data);
    }

    public static class Data extends AbstractRequestData<Data.Attributes> {
      private final String messageId;
      public Data(
        @JsonProperty(value = "Username", required = true) String username,
        @JsonProperty(value = "Password", required = true) String password,
        @JsonProperty("Attributes") Attributes attributes,
        @JsonProperty(value = "MessageID", required = true) String messageId
      ) {
        super(username, password, attributes);
        this.messageId = messageId;
      }

      @JsonProperty(value = "MessageID", required = true)
      @JsonInclude(Include.ALWAYS)
      public String getMessageId() {
        return this.messageId;
      }

      public static class Attributes {
        private final String depositAttribute1;
        public Attributes(@JsonProperty(value = "DepositAttribute1", required = true) String depositAttribute1) {
          this.depositAttribute1 = depositAttribute1;
        }

        @JsonProperty(value = "DepositAttribute1", required = true)
        @JsonInclude(Include.ALWAYS)
        public String getDepositAttribute1() {
          return this.depositAttribute1;
        }
      }
    }
  }
}
