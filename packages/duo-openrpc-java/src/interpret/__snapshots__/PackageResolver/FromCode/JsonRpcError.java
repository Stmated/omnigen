package some.base.pkg.errors;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
public class JsonRpcError {
  private final Integer code;
  private final Object data;
  private final String message;
  public JsonRpcError(Integer code, String message, Object data) {
    if (code != null) {
      this.code = code;
    } else {
      this.code = -1;
    }
    if (message != null) {
      this.message = message;
    } else {
      this.message = "Unknown Error";
    }
    this.data = data;
  }

  public Integer getCode() {
    return this.code;
  }

  public Object getData() {
    return this.data;
  }

  public String getMessage() {
    return this.message;
  }
}
