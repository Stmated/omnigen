package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class In extends AXOrB {
  private final String inType;
  public In(JsonNode raw, @JsonProperty("in_type") String inType) {
    super(raw);
    this.inType = inType;
  }

  @JsonProperty("in_type")
  public String getInType() {
    return this.inType;
  }
}
