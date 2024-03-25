package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ResponseData {
  @JsonValue
  private final JsonNode _raw;
  private WithReject _responseDataWithReject;
  private WithResult _responseDataWithResult;
  @JsonCreator
  public ResponseData(JsonNode raw) {
    this._raw = raw;
  }

  public JsonNode getRaw() {
    return this._raw;
  }

  public WithReject getResponseDataWithReject(ObjectMapper objectMapper) {
    if (this._responseDataWithReject != null) {
      return this._responseDataWithReject;
    }
    return this._responseDataWithReject = objectMapper.convertValue(this._raw, WithReject.class);
  }

  public WithResult getResponseDataWithResult(ObjectMapper objectMapper) {
    if (this._responseDataWithResult != null) {
      return this._responseDataWithResult;
    }
    return this._responseDataWithResult = objectMapper.convertValue(this._raw, WithResult.class);
  }

  public static class WithReject {
    private final String rejected;
    public WithReject(@JsonProperty(value = "rejected", required = true) String rejected) {
      this.rejected = rejected;
    }

    @JsonInclude(Include.ALWAYS)
    public String getRejected() {
      return this.rejected;
    }

    public String getResult() {
      return "0";
    }
  }
  public static class WithResult {
    public String getResult() {
      return "1";
    }
  }
}
