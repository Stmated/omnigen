package some.base.pkg.errors;

import com.fasterxml.jackson.databind.JsonNode;

public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(Integer code, String message, JsonNode data) {
    super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), data);
  }
}
