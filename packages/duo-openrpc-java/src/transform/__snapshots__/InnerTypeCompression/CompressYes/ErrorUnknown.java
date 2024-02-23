package generated.omnigen;

import com.fasterxml.jackson.databind.JsonNode;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse {
  private final ErrorUnknown.ErrorUnknownError error;
  private final String id;
  public ErrorUnknown(ErrorUnknown.ErrorUnknownError error, String id) {
    this.error = error;
    this.id = id;
  }

  public ErrorUnknown.ErrorUnknownError getError() {
    return this.error;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class ErrorUnknownError extends JsonRpcError {
    private final Integer code;
    private final JsonNode data;
    private final String message;
    public ErrorUnknownError(Integer code, String message, JsonNode data) {
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

    public JsonNode getData() {
      return this.data;
    }

    public String getMessage() {
      return this.message;
    }
  }
}