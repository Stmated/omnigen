package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CancelChargeRequestDataBase implements ICancelChargeRequestDataBase {
  private final int orderId;
  public CancelChargeRequestDataBase(@JsonProperty(value = "OrderID", required = true) int orderId) {
    this.orderId = orderId;
  }

  @JsonProperty(value = "OrderID", required = true)
  @JsonInclude(Include.ALWAYS)
  public int getOrderId() {
    return this.orderId;
  }
}
