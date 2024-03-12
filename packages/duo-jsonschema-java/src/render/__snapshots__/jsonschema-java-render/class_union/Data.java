package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Data {
  @JsonCreator
  public Data(JsonNode raw) {
    this._raw = raw;
  }

  @JsonValue
  private final JsonNode _raw;
  private DefaultData _defaultData;
  private AbortData _abortData;
  public JsonNode getRaw() {
    return this._raw;
  }

  public DefaultData getDefaultData(ObjectMapper objectMapper) {
    if (this._defaultData != null) {
      return this._defaultData;
    }
    return this._defaultData = objectMapper.convertValue(this._raw, DefaultData.class);
  }

  public AbortData getAbortData(ObjectMapper objectMapper) {
    if (this._abortData != null) {
      return this._abortData;
    }
    return this._abortData = objectMapper.convertValue(this._raw, AbortData.class);
  }
}
