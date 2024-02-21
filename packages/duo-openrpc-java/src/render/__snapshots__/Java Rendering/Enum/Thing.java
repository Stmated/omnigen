package generated.omnigen;

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
