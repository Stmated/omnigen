package generated.omnigen;

/**
 * Generic class to describe the JsonRpc error response package
 */
public class JsonRpcErrorResponse<T extends JsonRpcError> {
  private final T error;
  private final String id;
  public JsonRpcErrorResponse(String id, T error) {
    this.id = id;
    this.error = error;
  }

  public T getError() {
    return this.error;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }
}
