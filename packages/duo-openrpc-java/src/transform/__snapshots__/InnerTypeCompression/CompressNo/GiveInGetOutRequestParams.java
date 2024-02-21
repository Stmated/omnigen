package generated.omnigen;

import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequestParams extends JsonRpcRequestParams {
  private final In param;
  public GiveInGetOutRequestParams(In param) {
    this.param = param;
  }

  public In getParam() {
    return this.param;
  }
}
