package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest<GiveInGetOutRequestParams> {
  public GiveInGetOutRequest(
    @JsonProperty(value = "jsonrpc", required = true) String jsonrpc,
    @JsonProperty(value = "id", required = true) String id,
    @JsonProperty("params") GiveInGetOutRequestParams params
  ) {
    super(((jsonrpc == null) ? "2.0" : jsonrpc), id, params, "give_in_get_out");
  }
}
