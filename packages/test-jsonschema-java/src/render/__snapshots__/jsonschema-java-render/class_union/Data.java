package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Data {
  @JsonValue
  private final JsonNode _raw;
  private AbortData _abortData;
  private DefaultData _defaultData;

  @JsonCreator
  public Data(JsonNode raw) {
    this._raw = raw;
  }

  public AbortData getAbortData(ObjectMapper transformer) throws JsonProcessingException {
    if (this._abortData != null) {
      return this._abortData;
    }
    return this._abortData = transformer.treeToValue(this._raw, AbortData.class);
  }

  public DefaultData getDefaultData(ObjectMapper transformer) throws JsonProcessingException {
    if (this._defaultData != null) {
      return this._defaultData;
    }
    return this._defaultData = transformer.treeToValue(this._raw, DefaultData.class);
  }

  public JsonNode getRaw() {
    return this._raw;
  }
}
