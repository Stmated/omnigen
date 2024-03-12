package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbortData {
  private final String orderid;
  private final DescriptiveStringBoolean systemInitiated;
  private final StringBoolean userInitiated;
  public AbortData(
    @JsonProperty(value = "orderid", required = true) String orderid,
    @JsonProperty("user_initiated") StringBoolean userInitiated,
    @JsonProperty("system_initiated") DescriptiveStringBoolean systemInitiated
  ) {
    this.orderid = orderid;
    this.userInitiated = userInitiated;
    this.systemInitiated = systemInitiated;
  }

  @JsonInclude(Include.ALWAYS)
  public String getOrderid() {
    return this.orderid;
  }

  /**
   * Some descriptive description.
   */
  @JsonProperty("system_initiated")
  public DescriptiveStringBoolean getSystemInitiated() {
    return this.systemInitiated;
  }

  @JsonProperty("user_initiated")
  public StringBoolean getUserInitiated() {
    return this.userInitiated;
  }
}
