package some.other.pkg;

import java.util.HashMap;
import java.util.Map;

public class Thing implements IAdditionalProperties {
  private final Map<String, Object> _additionalProperties = new HashMap<String, Object>();
  private final String id;

  public Thing(String id) {
    this.id = id;
  }

  public void addAdditionalProperty(String key, Object value) {
    this._additionalProperties.put(key, value);
  }

  public Map<String, Object> getAdditionalProperties() {
    return this._additionalProperties;
  }

  public String getId() {
    return this.id;
  }
}
