package com.company;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest {
  private final String id;
  private final String method;

  public JsonRpcRequest(String id, String method) {
    this.id = id;
    this.method = method;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public String getMethod() {
    return this.method;
  }
}
