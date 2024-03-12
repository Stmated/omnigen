package com.company.out.directory2;

import com.company.out.Abs;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class B extends Abs {
  private final String b;
  private final double x;
  public B(String kind, String common, String b, double x) {
    super(kind, common);
    this.b = b;
    this.x = x;
  }

  public String getB() {
    return this.b;
  }

  public double getX() {
    return this.x;
  }
}
