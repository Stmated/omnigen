package some.other.pkg;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

public interface IAdditionalProperties {
  public Map<String, JsonNode> getAdditionalProperties();
}
