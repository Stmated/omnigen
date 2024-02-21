package generated.omnigen;

import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveIn1GetOut1RequestParams extends JsonRpcRequestParams {
  private final In1 param;
  public GiveIn1GetOut1RequestParams(In1 param) {
    this.param = param;
  }

  public In1 getParam() {
    return this.param;
  }
}
