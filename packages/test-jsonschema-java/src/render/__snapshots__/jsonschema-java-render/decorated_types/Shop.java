package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * Description about the Shop
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Shop {
  private final int id;
  private final String name;
  private final List<Order> orders;
  private final String tag;

  public Shop(int id, List<Order> orders, String name, String tag) {
    this.id = id;
    this.orders = orders;
    this.name = name;
    this.tag = tag;
  }

  /**
   * Unique Shop Id
   */
  public int getId() {
    return this.id;
  }

  public String getName() {
    return this.name;
  }

  /**
   * List of orders currently in this shop
   */
  public List<Order> getOrders() {
    return this.orders;
  }

  public String getTag() {
    return this.tag;
  }
}
