package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Out2 extends A implements IB, IC {
  private final String bar;
  private final String xyz;
  public Out2(
    @JsonProperty("kind") String kind,
    @JsonProperty("foo") String foo,
    @JsonProperty("bar") String bar,
    @JsonProperty("xyz") String xyz
  ) {
    super(kind, foo);
    this.bar = bar;
    this.xyz = xyz;
  }

  public String getBar() {
    return this.bar;
  }

  public String getXyz() {
    return this.xyz;
  }
}
