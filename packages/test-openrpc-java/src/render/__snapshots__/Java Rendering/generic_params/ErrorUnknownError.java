package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(
    @JsonProperty(value = "code") Integer code,
    @JsonProperty(value = "message") String message,
    @JsonProperty(value = "data") JsonNode data
  ) {
    super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), data);
  }
}
