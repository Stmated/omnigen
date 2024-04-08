package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse<ErrorUnknown.Error> {
  private final String id;

  public ErrorUnknown(Error error, String id) {
    super(error);
    this.id = id;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public static class Error extends JsonRpcError {
    private final JsonNode data;

    public Error(Integer code, String message, JsonNode data) {
      super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message));
      this.data = data;
    }

    public JsonNode getData() {
      return this.data;
    }
  }
}

