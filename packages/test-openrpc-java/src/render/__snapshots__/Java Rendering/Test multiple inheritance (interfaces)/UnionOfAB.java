package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class UnionOfAB {
  @JsonValue
  private final JsonNode _raw;
  private A _a;
  private B _b;

  @JsonCreator
  public UnionOfAB(JsonNode raw) {
    this._raw = raw;
  }

  public A getA(ObjectMapper transformer) {
    if (this._a != null) {
      return this._a;
    }
    return this._a = transformer.convertValue(this._raw, A.class);
  }

  public B getB(ObjectMapper transformer) {
    if (this._b != null) {
      return this._b;
    }
    return this._b = transformer.convertValue(this._raw, B.class);
  }

  public JsonNode getRaw() {
    return this._raw;
  }
}
