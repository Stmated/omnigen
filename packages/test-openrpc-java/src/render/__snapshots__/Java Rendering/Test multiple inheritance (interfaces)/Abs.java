package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Abs {
  private final String kind;

  public Abs(@JsonProperty("kind") String kind) {
    this.kind = kind;
  }

  public String getKind() {
    return this.kind;
  }
}
