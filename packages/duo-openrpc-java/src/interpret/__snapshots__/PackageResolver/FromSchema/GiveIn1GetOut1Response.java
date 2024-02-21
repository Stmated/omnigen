package com.company;

import com.company.out.directory1.A;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveIn1GetOut1Response extends JsonRpcResponse {
  private final A result;
  public GiveIn1GetOut1Response(String id, A result) {
    super(id);
    this.result = result;
  }

  public A getResult() {
    return this.result;
  }
}
