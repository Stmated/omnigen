package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2RequestParams extends JsonRpcRequestParams {
  private final In param;

  public GiveInGetOut2RequestParams(In param) {
    this.param = param;
  }

  public In getParam() {
    return this.param;
  }
}
