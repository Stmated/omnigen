package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;
import java.util.List;

/**
 * List all things
 * <p>As response: An array of things</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsResponse extends JsonRpcResponse {
  private final String id;
  private final List<Thing> result;

  public ListThingsResponse(String id, List<Thing> result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public List<Thing> getResult() {
    return this.result;
  }

  public static class Thing {
    private final String id;

    public Thing(@JsonProperty(value = "id", required = true) String id) {
      this.id = id;
    }

    public String getId() {
      return this.id;
    }
  }
}
