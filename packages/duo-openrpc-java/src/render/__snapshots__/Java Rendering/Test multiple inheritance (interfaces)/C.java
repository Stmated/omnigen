package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class C extends Abs implements IC {
  private final String xyz;

  public C(@JsonProperty("kind") String kind, @JsonProperty("xyz") String xyz) {
    super(kind);
    this.xyz = xyz;
  }

  public String getXyz() {
    return this.xyz;
  }
}
