package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_schemas_AbstractOther_allOf_inline_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractOtherSchema implements IAbstractOtherSchema {
  private final int abstractOtherPropertyA;
  private final String abstractOtherPropertyB;

  public AbstractOtherSchema(int abstractOtherPropertyA, String abstractOtherPropertyB) {
    this.abstractOtherPropertyA = abstractOtherPropertyA;
    this.abstractOtherPropertyB = abstractOtherPropertyB;
  }

  /**
   * components_schemas_AbstractOther_allOf_AbstractOtherPropertyA_description
   */
  public int getAbstractOtherPropertyA() {
    return this.abstractOtherPropertyA;
  }

  /**
   * components_schemas_AbstractOne_properties_AbstractOtherPropertyB_description
   */
  public String getAbstractOtherPropertyB() {
    return this.abstractOtherPropertyB;
  }
}

