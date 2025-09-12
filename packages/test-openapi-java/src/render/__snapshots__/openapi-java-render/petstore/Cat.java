package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Cat extends Pet {
  private final String catProperty;

  public Cat(String basePetProperty, String id, String petType, String catProperty) {
    super(basePetProperty, id, petType);
    this.catProperty = catProperty;
  }

  public String getCatProperty() {
    return this.catProperty;
  }
}
