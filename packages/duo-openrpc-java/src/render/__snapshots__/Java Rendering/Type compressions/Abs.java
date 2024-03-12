package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Abs {
  private final String common;
  private final String kind;
  public Abs(String kind, String common) {
    this.kind = kind;
    this.common = common;
  }

  public String getCommon() {
    return this.common;
  }

  public String getKind() {
    return this.kind;
  }
}
