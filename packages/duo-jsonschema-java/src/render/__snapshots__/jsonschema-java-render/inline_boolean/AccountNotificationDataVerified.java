package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Whether the account is verified or not. 0 for not verified, 1 for verified.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum AccountNotificationDataVerified {
  Fail("0"),
  OK("1");
  private String value;
  AccountNotificationDataVerified(String value) {
    this.value = value;
  }
}
