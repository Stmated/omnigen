package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class In1 {
  private final String value;

  public In1(@JsonProperty(value = "value") String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}
