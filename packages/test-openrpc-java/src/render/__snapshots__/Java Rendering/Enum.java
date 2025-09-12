package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SuppressWarnings("unused")
public class Enum {
  public static class ErrorUnknown extends JsonRpcErrorResponse<ErrorUnknownError> {
    public ErrorUnknown(String id, ErrorUnknownError error) {
      super(id, error);
    }
  }

  public static class ErrorUnknownError extends JsonRpcError {
    public ErrorUnknownError(JsonNode data, String message, Integer code) {
      super(data, ((message == null) ? "Unknown Error" : message), ((code == null) ? -1 : code));
    }
  }

  /**
   * Generic class to describe the JsonRpc error inside an error response
   */
  public static class JsonRpcError {
    private final int code;
    private final JsonNode data;
    private final String message;

    public JsonRpcError(JsonNode data, String message, int code) {
      this.data = data;
      this.message = message;
      this.code = code;
    }

    public int getCode() {
      return this.code;
    }

    public JsonNode getData() {
      return this.data;
    }

    public String getMessage() {
      return this.message;
    }
  }

  /**
   * Generic class to describe the JsonRpc error response package
   */
  public static class JsonRpcErrorResponse<T extends JsonRpcError> {
    private final T error;
    private final String id;

    public JsonRpcErrorResponse(String id, T error) {
      this.id = id;
      this.error = error;
    }

    public T getError() {
      return this.error;
    }

    public String getId() {
      return this.id;
    }

    public String getJsonrpc() {
      return "2.0";
    }
  }

  /**
   * Generic class to describe the JsonRpc request package
   */
  public static class JsonRpcRequest {
    private final String id;
    private final ListThingsRequestParams params;

    public JsonRpcRequest(ListThingsRequestParams params, String id) {
      this.params = params;
      this.id = id;
    }

    public String getId() {
      return this.id;
    }

    public String getJsonrpc() {
      return "2.0";
    }

    public String getMethod() {
      return "list_things";
    }

    public ListThingsRequestParams getParams() {
      return this.params;
    }
  }

  /**
   * Generic class to describe the JsonRpc request params
   */
  public static class JsonRpcRequestParams {

  }

  /**
   * Generic class to describe the JsonRpc response package
   */
  public static class JsonRpcResponse {
    private final String id;
    private final List<Thing> result;

    public JsonRpcResponse(String id, List<Thing> result) {
      this.id = id;
      this.result = result;
    }

    public String getId() {
      return this.id;
    }

    public String getJsonrpc() {
      return "2.0";
    }

    public List<Thing> getResult() {
      return this.result;
    }
  }

  public static class ListThingsError100 extends JsonRpcErrorResponse<ListThingsError100Error> {
    public ListThingsError100(String id, ListThingsError100Error error) {
      super(id, error);
    }
  }

  public static class ListThingsError100Error extends JsonRpcError {
    public ListThingsError100Error(JsonNode data, String message) {
      super(data, ((message == null) ? "Server is busy" : message), 100);
    }
  }

  /**
   * List all things
   */
  public static class ListThingsRequest extends JsonRpcRequest {
    public ListThingsRequest(ListThingsRequestParams params, String id) {
      super(params, id);
    }
  }

  public static class ListThingsRequestParams extends JsonRpcRequestParams {

  }

  /**
   * List all things
   * <p>As response: An array of things</p>
   */
  public static class ListThingsResponse extends JsonRpcResponse {
    public ListThingsResponse(String id, List<Thing> result) {
      super(id, result);
    }
  }

  /**
   * TagOrSpeciesOrString4: An unknown freetext value
   */
  public static class TagOrSpeciesOrString {
    private static final Map<Object, TagOrSpeciesOrString> _values = new HashMap<>();
    public static final TagOrSpeciesOrString _1337 = TagOrSpeciesOrString.get(1337d);
    public static final TagOrSpeciesOrString FOO = TagOrSpeciesOrString.get("foo");
    public static final TagOrSpeciesOrString SPECIES_A = TagOrSpeciesOrString.get("SpeciesA");
    public static final TagOrSpeciesOrString SPECIES_B = TagOrSpeciesOrString.get("SpeciesB");
    public static final TagOrSpeciesOrString TAG_A = TagOrSpeciesOrString.get("TagA");
    public static final TagOrSpeciesOrString TAG_B = TagOrSpeciesOrString.get("TagB");
    public static final TagOrSpeciesOrString TAG_C = TagOrSpeciesOrString.get("TagC");
    @JsonValue
    private final Object _value;

    private TagOrSpeciesOrString(Object value) {
      this._value = value;
    }

    public Object getValue() {
      return this._value;
    }

    public Species getAsSpecies() {
      return Species.valueOf(((String) this._value));
    }

    public Tag getAsTag() {
      return Tag.valueOf(((String) this._value));
    }

    public TagOrSpeciesOrStringDouble getAsTagOrSpeciesOrStringDouble() {
      return TagOrSpeciesOrStringDouble.valueOf(((double) this._value));
    }

    public boolean isKnown() {
      return this == TagOrSpeciesOrString.TAG_A || this == TagOrSpeciesOrString.TAG_B || this == TagOrSpeciesOrString.TAG_C || this == TagOrSpeciesOrString.SPECIES_A || this == TagOrSpeciesOrString.SPECIES_B || this == TagOrSpeciesOrString._1337 || this == TagOrSpeciesOrString.FOO;
    }

    public boolean isSpecies() {
      return this == TagOrSpeciesOrString.SPECIES_A || this == TagOrSpeciesOrString.SPECIES_B;
    }

    public boolean isTag() {
      return this == TagOrSpeciesOrString.TAG_A || this == TagOrSpeciesOrString.TAG_B || this == TagOrSpeciesOrString.TAG_C;
    }

    public boolean isTagOrSpeciesOrStringDouble() {
      return this == TagOrSpeciesOrString._1337;
    }

    @JsonCreator
    public static TagOrSpeciesOrString get(Object value) {
      if (TagOrSpeciesOrString._values.containsKey(value)) {
        return TagOrSpeciesOrString._values.get(value);
      } else  {
        final var created = new TagOrSpeciesOrString(value);
        TagOrSpeciesOrString._values.put(value, created);
        return created;
      }
    }
  }

  public static class Thing {
    private final String id;
    private final Tag tag;
    private final ThingType type;

    public Thing(String id, ThingType type, Tag tag) {
      this.id = id;
      this.type = type;
      this.tag = tag;
    }

    public String getId() {
      return this.id;
    }

    public Tag getTag() {
      return this.tag;
    }

    public ThingType getType() {
      return this.type;
    }
  }

  public enum Species {
    SPECIES_A("SpeciesA"),
    SPECIES_B("SpeciesB");

    @JsonValue
    private final String value;

    Species(String value) {
      this.value = value;
    }

    public String getValue() {
      return this.value;
    }
  }

  public enum Tag {
    TAG_A("TagA"),
    TAG_B("TagB"),
    TAG_C("TagC");

    @JsonValue
    private final String value;

    Tag(String value) {
      this.value = value;
    }

    public String getValue() {
      return this.value;
    }
  }

  public enum TagOrSpeciesOrStringDouble {
    _1337(1337d);

    @JsonValue
    private final double value;

    TagOrSpeciesOrStringDouble(double value) {
      this.value = value;
    }

    public double getValue() {
      return this.value;
    }
  }

  public enum ThingType {
    TYPE_A("TypeA"),
    TYPE_B("TypeB"),
    TYPE_C("TypeC");

    @JsonValue
    private final String value;

    ThingType(String value) {
      this.value = value;
    }

    public String getValue() {
      return this.value;
    }
  }
}
