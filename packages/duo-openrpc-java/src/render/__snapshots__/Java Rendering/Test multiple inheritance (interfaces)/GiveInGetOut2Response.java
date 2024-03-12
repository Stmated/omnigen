package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOut2Response extends JsonRpcResponse<Out2> {
  public GiveInGetOut2Response(@JsonProperty("id") String id, @JsonProperty("result") Out2 result) {
    super(id, result);
  }
}
