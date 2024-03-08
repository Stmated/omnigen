package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class DefaultData {
  private final DefaultDataInlineResult inlineResult;
  private final String orderid;
  public DefaultData(
    @JsonProperty(value = "orderid", required = true) String orderid,
    @JsonProperty("inlineResult") DefaultDataInlineResult inlineResult
  ) {
    this.orderid = orderid;
    this.inlineResult = inlineResult;
  }

  /**
   * Some inline description
   */
  public DefaultDataInlineResult getInlineResult() {
    return this.inlineResult;
  }

  @JsonProperty(required = true)
  @JsonInclude(Include.ALWAYS)
  public String getOrderid() {
    return this.orderid;
  }
}
