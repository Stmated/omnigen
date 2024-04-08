package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DataEntry {
  private final String transferstate;

  public DataEntry(String transferstate) {
    this.transferstate = transferstate;
  }

  /**
   * The current state of the withdrawal.
   * <h5>Examples</h5>
   * <ul>
   *   <li>EXECUTING</li>
   *   <li>EXECUTED</li>
   *   <li>PENDING</li>
   * </ul>
   */
  public String getTransferstate() {
    return this.transferstate;
  }
}
