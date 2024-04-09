package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_schemas_AbstractOne_allOf_inline_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractOneSchema {
  private final Integer abstractOnePropertyA;
  private final String abstractOnePropertyB;

  public AbstractOneSchema(Integer abstractOnePropertyA, String abstractOnePropertyB) {
    this.abstractOnePropertyA = abstractOnePropertyA;
    this.abstractOnePropertyB = abstractOnePropertyB;
  }

  /**
   * components_schemas_NumberSchema_OneOf_Number_description, components_schemas_NumberOrNull_description
   */
  public Integer getAbstractOnePropertyA() {
    return this.abstractOnePropertyA;
  }

  /**
   * components_schemas_AbstractOne_properties_AbstractOnePropertyB_description
   */
  public String getAbstractOnePropertyB() {
    return this.abstractOnePropertyB;
  }
}

