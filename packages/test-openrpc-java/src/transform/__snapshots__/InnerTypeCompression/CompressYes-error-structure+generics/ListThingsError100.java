package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsError100 extends JsonRpcErrorResponse<ListThingsError100.Error> {
  private final String id;

  public ListThingsError100(Error error, String id) {
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
    private final String message;

    public Error(String message, JsonNode data) {
      this.message = ((message == null) ? "Server is busy" : message);
      this.data = data;
    }

    public int getCode() {
      return 100;
    }

    public JsonNode getData() {
      return this.data;
    }

    public String getMessage() {
      return this.message;
    }
  }
}
