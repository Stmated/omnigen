

package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest {
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


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List all things
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsRequest extends JsonRpcRequest {
  public ListThingsRequest(ListThingsRequestParams params, String id) {
    super(params, id);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse {
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


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * List all things
 * <p>As response: An array of things</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsResponse extends JsonRpcResponse {
  public ListThingsResponse(String id, List<Thing> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum ThingType {
  TYPE_A("TypeA"),
  TYPE_B("TypeB"),
  TYPE_C("TypeC");

  private final String value;

  ThingType(String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum Tag {
  TAG_A("TagA"),
  TAG_B("TagB"),
  TAG_C("TagC");

  private final String value;

  Tag(String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Thing {
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


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsError100 extends JsonRpcErrorResponse<ListThingsError100Error> {
  public ListThingsError100(String id, ListThingsError100Error error) {
    super(id, error);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcErrorResponse<T extends JsonRpcError> {
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


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
  private final int code;
  private final Object data;
  private final String message;

  public JsonRpcError(Object data, String message, int code) {
    this.data = data;
    this.message = message;
    this.code = code;
  }

  public int getCode() {
    return this.code;
  }

  public Object getData() {
    return this.data;
  }

  public String getMessage() {
    return this.message;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsError100Error extends JsonRpcError {
  public ListThingsError100Error(Object data, String message) {
    super(data, ((message == null) ? "Server is busy" : message), 100);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse<ErrorUnknownError> {
  public ErrorUnknown(String id, ErrorUnknownError error) {
    super(id, error);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(Object data, String message, Integer code) {
    super(data, ((message == null) ? "Unknown Error" : message), ((code == null) ? -1 : code));
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum Species {
  SPECIES_A("SpeciesA"),
  SPECIES_B("SpeciesB");

  private final String value;

  Species(String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.HashMap;
import java.util.Map;

/**
 * String: An unknown freetext value
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class TagOrSpeciesOrString {
  private static final Map<Object, TagOrSpeciesOrString> _values = new HashMap<>();
  public static final TagOrSpeciesOrString _1337 = TagOrSpeciesOrString.get(1337d);
  public static final TagOrSpeciesOrString FOO = TagOrSpeciesOrString.get("foo");
  public static final TagOrSpeciesOrString SPECIES_A = TagOrSpeciesOrString.get("SpeciesA");
  public static final TagOrSpeciesOrString SPECIES_B = TagOrSpeciesOrString.get("SpeciesB");
  public static final TagOrSpeciesOrString TAG_A = TagOrSpeciesOrString.get("TagA");
  public static final TagOrSpeciesOrString TAG_B = TagOrSpeciesOrString.get("TagB");
  public static final TagOrSpeciesOrString TAG_C = TagOrSpeciesOrString.get("TagC");
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


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum TagOrSpeciesOrStringDouble {
  _1337(1337d);

  private final double value;

  TagOrSpeciesOrStringDouble(double value) {
    this.value = value;
  }

  public double getValue() {
    return this.value;
  }
}
