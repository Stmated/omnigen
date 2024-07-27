package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class A extends Abs {
  private final String foo;

  public A(String kind, String foo) {
    super(kind);
    this.foo = foo;
  }

  public String getFoo() {
    return this.foo;
  }
}
