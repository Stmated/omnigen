package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class In extends UnionOfAB {
  @JsonProperty(value = "in_type")
  private final String inType;

  public In(JsonNode raw, @JsonProperty(value = "in_type") String inType) {
    super(raw);
    this.inType = inType;
  }

  public String getInType() {
    return this.inType;
  }
}
