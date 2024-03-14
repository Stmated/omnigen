package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.HashMap;
import java.util.Map;

public class TagOrSpeciesOrString {
  private static final Map<Object, TagOrSpeciesOrString> _values = new HashMap<Object, TagOrSpeciesOrString>();
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

  public Species getAsSpecies() {
    return Species.valueOf(((String) this._value));
  }

  public Tag getAsTag() {
    return Tag.valueOf(((String) this._value));
  }

  public Object getValue() {
    return this._value;
  }

  public boolean isKnown() {
    return this == TagOrSpeciesOrString.TAG_A || this == TagOrSpeciesOrString.TAG_B || this == TagOrSpeciesOrString.TAG_C || this == TagOrSpeciesOrString.SPECIES_A || this == TagOrSpeciesOrString.SPECIES_B || this == TagOrSpeciesOrString.FOO || this == TagOrSpeciesOrString._1337;
  }

  public boolean isSpecies() {
    return this == TagOrSpeciesOrString.SPECIES_A || this == TagOrSpeciesOrString.SPECIES_B;
  }

  public boolean isTag() {
    return this == TagOrSpeciesOrString.TAG_A || this == TagOrSpeciesOrString.TAG_B || this == TagOrSpeciesOrString.TAG_C;
  }

  @JsonCreator
  public static TagOrSpeciesOrString get(Object value) {
    if (TagOrSpeciesOrString._values.containsKey(value) == true) {
      return TagOrSpeciesOrString._values.get(value);
    } else {
      final var created = new TagOrSpeciesOrString(value);
      TagOrSpeciesOrString._values.set(value, created);
      return created;
    }
  }
}
