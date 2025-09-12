package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Order {
  /**
   * @default true
   */
  private final boolean active;
  private final int id;
  private final int percentage;

  public Order(int id, boolean active, int percentage) {
    this.id = id;
    this.active = active;
    this.percentage = percentage;
  }

  /**
   * If true, then the order is still active, otherwise it is cancelled
   */
  public boolean isActive() {
    return this.active;
  }

  /**
   * Unique Order Id
   */
  public int getId() {
    return this.id;
  }

  /**
   * The percentage of completion for the order
   */
  public int getPercentage() {
    return this.percentage;
  }
}
