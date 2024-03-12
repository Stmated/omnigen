package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {
  private final In param;
  public JsonRpcRequestParams(@JsonProperty("param") In param) {
    this.param = param;
  }

  public In getParam() {
    return this.param;
  }
}
