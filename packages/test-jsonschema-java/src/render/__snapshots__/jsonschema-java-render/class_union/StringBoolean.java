package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum StringBoolean {
  Fail("0"),
  OK("1");

  @JsonValue
  private final String value;

  StringBoolean(String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}
