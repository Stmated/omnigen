package com.company;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveIn2GetOut2Request extends JsonRpcRequest {
  private final GiveIn2GetOut2RequestParams params;
  public GiveIn2GetOut2Request(String jsonrpc, String id, GiveIn2GetOut2RequestParams params) {
    super(((jsonrpc == null) ? "2.0" : jsonrpc), id);
    this.params = params;
  }

  public String getMethod() {
    return "give_in2_get_out2";
  }

  public GiveIn2GetOut2RequestParams getParams() {
    return this.params;
  }
}
