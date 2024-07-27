package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Out {
  private final String result;

  public Out(@JsonProperty(value = "result") String result) {
    this.result = result;
  }

  public String getResult() {
    return this.result;
  }
}
