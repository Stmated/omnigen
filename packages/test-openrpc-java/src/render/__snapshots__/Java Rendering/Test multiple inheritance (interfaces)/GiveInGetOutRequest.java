package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutRequest extends JsonRpcRequest<GiveInGetOutRequestParams> {
  public GiveInGetOutRequest(
    @JsonProperty(value = "id", required = true) String id,
    @JsonProperty("params") GiveInGetOutRequestParams params
  ) {
    super(id, params, "give_in_get_out");
  }
}
