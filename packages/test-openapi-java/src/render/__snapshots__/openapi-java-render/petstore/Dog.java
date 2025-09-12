package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Dog extends Pet {
  private final int age;
  private final String dogProperty;

  public Dog(String basePetProperty, String id, String petType, String dogProperty, int age) {
    super(basePetProperty, id, petType);
    this.dogProperty = dogProperty;
    this.age = age;
  }

  public int getAge() {
    return this.age;
  }

  public String getDogProperty() {
    return this.dogProperty;
  }
}
