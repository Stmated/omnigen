package com.company;

import com.company.in.In2;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GiveIn2GetOut2RequestParams extends JsonRpcRequestParams {
  private final In2 param;
  public GiveIn2GetOut2RequestParams(In2 param) {
    this.param = param;
  }

  public In2 getParam() {
    return this.param;
  }
}
