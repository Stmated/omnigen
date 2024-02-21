package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsError100 extends JsonRpcErrorResponse<ListThingsError100.ListThingsError100Error> {
  private final String id;
  public ListThingsError100(ListThingsError100.ListThingsError100Error error, String id) {
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
  public static class ListThingsError100Error extends JsonRpcError {
    private final JsonNode data;
    public ListThingsError100Error(String message, JsonNode data) {
      super(100, ((message == null) ? "Server is busy" : message));
      this.data = data;
    }

    public JsonNode getData() {
      return this.data;
    }
  }
}
