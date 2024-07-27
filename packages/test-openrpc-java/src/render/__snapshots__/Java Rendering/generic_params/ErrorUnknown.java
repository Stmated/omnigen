package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse {
  public ErrorUnknown(
    @JsonProperty(value = "error", required = true) ErrorUnknownError error,
    @JsonProperty(value = "id") String id
  ) {
    super(error, id);
  }
}
