package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_schemas_AbstractOther_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractOther extends AbstractOne implements IAbstractOtherSchema {
  private final int abstractOtherPropertyA;
  private final String abstractOtherPropertyB;

  public AbstractOther(
    Integer abstractOnePropertyA,
    String abstractOnePropertyB,
    int abstractOtherPropertyA,
    String abstractOtherPropertyB
  ) {
    super(abstractOnePropertyA, abstractOnePropertyB);
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

