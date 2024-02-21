package generated.omnigen;

import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2Request extends JsonRpcRequest<GiveInGetOut2RequestParams> {
  public GiveInGetOut2Request(String jsonrpc, String id, GiveInGetOut2RequestParams params) {
    super(((jsonrpc == null) ? "2.0" : jsonrpc), id, params, "give_in_get_out2");
  }
}
