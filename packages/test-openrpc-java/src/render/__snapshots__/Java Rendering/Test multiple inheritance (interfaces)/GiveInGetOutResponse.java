package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveInGetOutResponse extends JsonRpcResponse<Out> {
  public GiveInGetOutResponse(@JsonProperty("id") String id, @JsonProperty("result") Out result) {
    super(id, result);
  }
}
