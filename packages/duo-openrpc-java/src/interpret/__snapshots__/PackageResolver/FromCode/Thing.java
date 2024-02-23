package some.other.pkg;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.Map;

public class Thing implements IAdditionalProperties {
  private final String id;
  public Thing(String id) {
    this.id = id;
  }

  private final Map<String, JsonNode> _additionalProperties = new HashMap<String, JsonNode>();
  @JsonAnySetter
  public void addAdditionalProperty(String key, JsonNode value) {
    this._additionalProperties.put(key, value);
  }

  @JsonAnyGetter
  public Map<String, JsonNode> getAdditionalProperties() {
    return this._additionalProperties;
  }

  public String getId() {
    return this.id;
  }
}