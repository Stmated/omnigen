package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AccountNotificationData {
  private final String orderid;
  private final AccountNotificationDataVerified verified;
  public AccountNotificationData(String orderid, AccountNotificationDataVerified verified) {
    this.orderid = orderid;
    this.verified = verified;
  }

  public String getOrderid() {
    return this.orderid;
  }

  /**
   * Whether the account is verified or not. 0 for not verified, 1 for verified.
   */
  public AccountNotificationDataVerified getVerified() {
    return this.verified;
  }
}
