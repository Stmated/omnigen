package some.other.pkg;

import java.util.HashMap;
import java.util.Map;

public class Thing implements IAdditionalProperties {
  private final String id;
  private Map<String, Object> additionalProperties = new HashMap<>();

  public Thing(String id) {
    this.id = id;
  }

  public void addAdditionalProperty(String key, Object value) {
    this.additionalProperties.put(key, value);
  }

  public Map<String, Object> getAdditionalProperties() {
    return this.additionalProperties;
  }

  public String getId() {
    return this.id;
  }
}
