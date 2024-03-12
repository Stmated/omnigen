package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcErrorResponse<TError extends JsonRpcError> {
  private final TError error;
  public JsonRpcErrorResponse(TError error) {
    this.error = error;
  }

  public TError getError() {
    return this.error;
  }
}
