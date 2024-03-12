package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List all things
 * <p>As response: An array of things</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ListThingsResponse extends JsonRpcResponse {
  private final String id;
  private final ListThingsResponse.Thing[] result;
  public ListThingsResponse(String id, ListThingsResponse.Thing[] result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public ListThingsResponse.Thing[] getResult() {
    return this.result;
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class Thing {
    private final String id;
    public Thing(String id) {
      this.id = id;
    }

    public String getId() {
      return this.id;
    }
  }
}
