package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CancelChargeRequestDataBase implements ICancelChargeRequestDataBase {
  @JsonProperty(value = "OrderID", required = true)
  @JsonInclude
  private final int orderId;

  public CancelChargeRequestDataBase(@JsonProperty(value = "OrderID", required = true) int orderId) {
    this.orderId = orderId;
  }

  public int getOrderID() {
    return this.orderId;
  }
}
