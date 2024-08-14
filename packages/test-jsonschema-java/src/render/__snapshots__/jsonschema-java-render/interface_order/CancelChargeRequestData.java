package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CancelChargeRequestData extends AbstractRequestData implements ICancelChargeRequestDataBase {
  private final int orderId;

  public CancelChargeRequestData(String username, String password, int orderId) {
    super(username, password);
    this.orderId = orderId;
  }

  public int getOrderID() {
    return this.orderId;
  }
}
