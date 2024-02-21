package com.company;

import com.fasterxml.jackson.databind.JsonNode;
import javax.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
  private final Integer code;
  private final JsonNode data;
  private final String message;
  public JsonRpcError(Integer code, String message, JsonNode data) {
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
