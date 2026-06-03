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
   * <p>Enum Description</p>
   * <section>
   *   <h2>Examples</h2>
   *   <ul>
   *     <li>{@code "EXECUTING"}</li>
   *     <li>{@code "EXECUTED"}</li>
   *     <li>{@code "PENDING"}</li>
   *   </ul>
   * </section>
   */
  public String getTransferstate() {
    return this.transferstate;
  }
}
