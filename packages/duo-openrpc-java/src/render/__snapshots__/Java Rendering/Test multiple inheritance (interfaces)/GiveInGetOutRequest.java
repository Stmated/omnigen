package generated.omnigen;

import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest<GiveInGetOutRequestParams> {
  public GiveInGetOutRequest(String jsonrpc, String id, GiveInGetOutRequestParams params) {
    super(((jsonrpc == null) ? "2.0" : jsonrpc), id, params, "give_in_get_out");
  }
}
