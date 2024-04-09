package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_schemas_ResultSchema_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ResultSchema extends AbstractOne implements IResultSchemaSchema {
  private final String resultSchemaPropertyA;

  public ResultSchema(Integer abstractOnePropertyA, String abstractOnePropertyB, String resultSchemaPropertyA) {
    super(abstractOnePropertyA, abstractOnePropertyB);
    this.resultSchemaPropertyA = resultSchemaPropertyA;
  }

  /**
   * components_schemas_ResultSchema_allOf_inline_properties_ResultSchemaPropertyA_description
   */
  public String getResultSchemaPropertyA() {
    return this.resultSchemaPropertyA;
  }
}

