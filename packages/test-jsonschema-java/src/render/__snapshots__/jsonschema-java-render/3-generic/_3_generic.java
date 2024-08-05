package generated.omnigen;

import jakarta.annotation.Generated;
import lombok.Getter;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
@SuppressWarnings("unused")
public class _3_generic {
  @Getter
  public static class A<TAp, TB extends B<?, ? extends C<?, ? extends D<?>>>> {
    private final String a;
    private final TAp ap;
    private final TB b;

    public A(String a, TAp ap, TB b) {
      this.a = a;
      this.ap = ap;
      this.b = b;
    }
  }

  @Getter
  public static class AA extends A<String, BA> {
    private final String aa;

    public AA(String a, String ap, BA b, String aa) {
      super(a, ap, b);
      this.aa = aa;
    }
  }

  @Getter
  public static class AB extends A<Integer, BBObject> {
    private final String ab;

    public AB(String a, int ap, BBObject b, String ab) {
      super(a, ap, b);
      this.ab = ab;
    }
  }

  @Getter
  public static class B<TBp, TC extends C<?, ? extends D<?>>> {
    private final String b;
    private final TBp bp;
    private final TC c;

    public B(String b, TBp bp, TC c) {
      this.b = b;
      this.bp = bp;
      this.c = c;
    }
  }

  @Getter
  public static class BA extends B<String, CA> {
    private final String ba;

    public BA(String b, String bp, CA c, String ba) {
      super(b, bp, c);
      this.ba = ba;
    }
  }

  @Getter
  public static class BBObject extends B<Integer, CB> {
    private final String bb;

    public BBObject(String b, int bp, CB c, String bb) {
      super(b, bp, c);
      this.bb = bb;
    }
  }

  @Getter
  public static class C<TCp, TD extends D<?>> {
    private final String c;
    private final TCp cp;
    private final TD d;

    public C(String c, TCp cp, TD d) {
      this.c = c;
      this.cp = cp;
      this.d = d;
    }
  }

  @Getter
  public static class CA extends C<String, DA> {
    private final String ca;

    public CA(String c, String cp, DA d, String ca) {
      super(c, cp, d);
      this.ca = ca;
    }
  }

  @Getter
  public static class CB extends C<Integer, DB> {
    private final String cb;

    public CB(String c, int cp, DB d, String cb) {
      super(c, cp, d);
      this.cb = cb;
    }
  }

  @Getter
  public static class D<T> {
    private final String d;
    private final T dp;

    public D(String d, T dp) {
      this.d = d;
      this.dp = dp;
    }
  }

  @Getter
  public static class DA extends D<String> {
    private final String da;

    public DA(String d, String dp, String da) {
      super(d, dp);
      this.da = da;
    }
  }

  @Getter
  public static class DB extends D<Integer> {
    private final String db;

    public DB(String d, int dp, String db) {
      super(d, dp);
      this.db = db;
    }
  }
}
