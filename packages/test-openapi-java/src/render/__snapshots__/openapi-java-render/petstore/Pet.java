package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Pet {
  private final String basePetProperty;
  private final String id;
  private final String petType;

  public Pet(String basePetProperty, String id, String petType) {
    this.basePetProperty = basePetProperty;
    this.id = id;
    this.petType = petType;
  }

  public String getBasePetProperty() {
    return this.basePetProperty;
  }

  public String getId() {
    return this.id;
  }

  public String getPetType() {
    return this.petType;
  }
}
