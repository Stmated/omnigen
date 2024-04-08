package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;

public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(JsonNode data, Integer code, String message) {
    super(data, ((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message));
  }
}
