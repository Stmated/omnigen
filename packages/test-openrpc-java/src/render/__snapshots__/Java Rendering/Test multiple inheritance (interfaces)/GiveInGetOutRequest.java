package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest<GiveInGetOutRequestParams> {
  public GiveInGetOutRequest(String id, GiveInGetOutRequestParams params) {
    super(id, params);
  }

  public String getMethod() {
    return "give_in_get_out";
  }
}
