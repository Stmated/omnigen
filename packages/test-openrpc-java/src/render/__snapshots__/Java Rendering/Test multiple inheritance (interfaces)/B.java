package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class B extends Abs implements IB {
  private final String bar;

  public B(String kind, String bar) {
    super(kind);
    this.bar = bar;
  }

  public String getBar() {
    return this.bar;
  }
}
