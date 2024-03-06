package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.annotation.Generated;

/**
 * Date of birth (YYYY-MM-DD, ISO 8601) of the beneficiary, or organisational number for the organisation.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DateOfBirthOrOrganization {
  @JsonCreator
  public DateOfBirthOrOrganization(JsonNode raw) {
    this._raw = raw;
  }

  @JsonValue
  private final JsonNode _raw;
  private String _string;
  public JsonNode getRaw() {
    return this._raw;
  }

  public String getString(ObjectMapper objectMapper) {
    if (this._string != null) {
      return this._string;
    }
    return this._string = objectMapper.convertValue(this._raw, String.class);
  }
}
