package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DepositRequest extends JsonRpcRequest<DepositRequest.DepositRequestParams> {
  public DepositRequest(
    @JsonProperty(value = "jsonrpc", required = true) String jsonrpc,
    @JsonProperty(value = "id", required = true) String id,
    @JsonProperty("params") DepositRequest.DepositRequestParams params
  ) {
    super(((jsonrpc == null) ? "2.0" : jsonrpc), id, params, "Deposit");
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class DepositRequestParams extends JsonRpcRequestParams<DepositRequest.DepositRequestParams.DepositRequestData> {
    public DepositRequestParams(
      @JsonProperty(value = "Signature", required = true) String signature,
      @JsonProperty(value = "UUID", required = true) String uuid,
      @JsonProperty("Data") DepositRequest.DepositRequestParams.DepositRequestData data
    ) {
      super(signature, uuid, data);
    }

    @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
    public static class DepositRequestData extends AbstractRequestData<DepositRequest.DepositRequestParams.DepositRequestData.DepositRequestDataAttributes> {
      private final String messageId;
      public DepositRequestData(
        @JsonProperty(value = "Username", required = true) String username,
        @JsonProperty(value = "Password", required = true) String password,
        @JsonProperty("Attributes") DepositRequest.DepositRequestParams.DepositRequestData.DepositRequestDataAttributes attributes,
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

      @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
      public static class DepositRequestDataAttributes {
        private final String depositAttribute1;
        public DepositRequestDataAttributes(@JsonProperty(value = "DepositAttribute1", required = true) String depositAttribute1) {
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
