package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveIn2GetOut2Response extends JsonRpcResponse {
  private final B result;
  public GiveIn2GetOut2Response(String id, B result) {
    super(id);
    this.result = result;
  }

  public B getResult() {
    return this.result;
  }
}
