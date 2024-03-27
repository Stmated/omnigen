package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Enum Description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum TransferState {
  EXECUTING("EXECUTING"),
  EXECUTED("EXECUTED"),
  PENDING("PENDING");
  private String value;
  TransferState(String value) {
    this.value = value;
  }
}
