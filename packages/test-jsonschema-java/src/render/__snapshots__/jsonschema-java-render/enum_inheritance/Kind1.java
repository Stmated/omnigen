package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.annotation.Generated;

/**
 * A comment
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum Kind1 {
  _1_A("1A"),
  _1_B("1B");

  @JsonValue
  private final String value;

  Kind1(String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}
