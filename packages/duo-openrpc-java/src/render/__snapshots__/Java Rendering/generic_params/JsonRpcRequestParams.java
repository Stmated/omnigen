package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams<T extends AbstractRequestData<?>> {
  private final T data;
  private final String signature;
  private final String uuid;
  public JsonRpcRequestParams(
    @JsonProperty(value = "Signature", required = true) String signature,
    @JsonProperty(value = "UUID", required = true) String uuid,
    @JsonProperty("Data") T data
  ) {
    this.signature = signature;
    this.uuid = uuid;
    this.data = data;
  }

  @JsonProperty("Data")
  public T getData() {
    return this.data;
  }

  @JsonProperty(value = "Signature", required = true)
  @JsonInclude(Include.ALWAYS)
  public String getSignature() {
    return this.signature;
  }

  @JsonProperty(value = "UUID", required = true)
  @JsonInclude(Include.ALWAYS)
  public String getUuid() {
    return this.uuid;
  }
}
