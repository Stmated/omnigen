package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class CancelChargeRequestDataBase implements ICancelChargeRequestDataBase {
  private final int orderId;

  public CancelChargeRequestDataBase(int orderId) {
    this.orderId = orderId;
  }

  public int getOrderID() {
    return this.orderId;
  }
}
