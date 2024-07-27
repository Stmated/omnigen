package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum SomeEnum {
  Zero(0),
  One(1),
  Two(2),
  Three(3);

  @JsonValue
  private final int value;

  SomeEnum(int value) {
    this.value = value;
  }

  public int getValue() {
    return this.value;
  }
}
