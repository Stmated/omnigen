package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;

public class ListThingsError100Error extends JsonRpcError {
  public ListThingsError100Error(JsonNode data, String message) {
    super(data, 100, ((message == null) ? "Server is busy" : message));
  }
}
