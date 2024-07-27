package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbortData {
  @JsonProperty(value = "orderid", required = true)
  @JsonInclude
  private final String orderid;
  @JsonProperty(value = "system_initiated")
  private final StringBoolean systemInitiated;
  @JsonProperty(value = "user_initiated")
  private final StringBoolean userInitiated;

  public AbortData(
    @JsonProperty(value = "orderid", required = true) String orderid,
    @JsonProperty(value = "user_initiated") StringBoolean userInitiated,
    @JsonProperty(value = "system_initiated") StringBoolean systemInitiated
  ) {
    this.orderid = orderid;
    this.userInitiated = userInitiated;
    this.systemInitiated = systemInitiated;
  }

  public String getOrderid() {
    return this.orderid;
  }

  /**
   * Some descriptive description.
   */
  public StringBoolean getSystemInitiated() {
    return this.systemInitiated;
  }

  public StringBoolean getUserInitiated() {
    return this.userInitiated;
  }
}
