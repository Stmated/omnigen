package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveIn2GetOut2RequestParams extends JsonRpcRequestParams {
  private final In2 param;

  public GiveIn2GetOut2RequestParams(@JsonProperty(value = "param") In2 param) {
    this.param = param;
  }

  public In2 getParam() {
    return this.param;
  }
}
