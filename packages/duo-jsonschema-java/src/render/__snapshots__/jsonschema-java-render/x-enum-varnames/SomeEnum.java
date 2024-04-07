package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum SomeEnum {
  Zero(0),
  One(1),
  Two(2),
  Three(3);
  private String value;

  SomeEnum(String value) {
    this.value = value;
  }
}
