package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveIn1GetOut1Request extends JsonRpcRequest {
  private final GiveIn1GetOut1RequestParams params;

  public GiveIn1GetOut1Request(String id, GiveIn1GetOut1RequestParams params) {
    super(id, "give_in1_get_out1");
    this.params = params;
  }

  public GiveIn1GetOut1RequestParams getParams() {
    return this.params;
  }
}
