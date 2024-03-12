package com.company.out.directory1;

import com.company.out.Abs;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class A extends Abs {
  private final String a;
  private final String x;
  public A(String kind, String common, String a, String x) {
    super(kind, common);
    this.a = a;
    this.x = x;
  }

  public String getA() {
    return this.a;
  }

  public String getX() {
    return this.x;
  }
}
