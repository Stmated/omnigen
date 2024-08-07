package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams<T extends AbstractRequestData<?>> {
  @JsonProperty(value = "Data", required = true)
  @JsonInclude
  private final T data;
  @JsonProperty(value = "Signature", required = true)
  @JsonInclude
  private final String signature;
  @JsonProperty(value = "UUID", required = true)
  @JsonInclude
  private final String uuid;

  public JsonRpcRequestParams(
    @JsonProperty(value = "Signature", required = true) String signature,
    @JsonProperty(value = "UUID", required = true) String uuid,
    @JsonProperty(value = "Data", required = true) T data
  ) {
    this.signature = signature;
    this.uuid = uuid;
    this.data = data;
  }

  public T getData() {
    return this.data;
  }

  public String getSignature() {
    return this.signature;
  }

  public String getUUID() {
    return this.uuid;
  }
}
