package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse<ErrorUnknown.ErrorUnknownError> {
  private final String id;
  public ErrorUnknown(ErrorUnknown.ErrorUnknownError error, String id) {
    super(error);
    this.id = id;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class ErrorUnknownError extends JsonRpcError {
    private final JsonNode data;
    public ErrorUnknownError(Integer code, String message, JsonNode data) {
      super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message));
      this.data = data;
    }

    public JsonNode getData() {
      return this.data;
    }
  }
}
