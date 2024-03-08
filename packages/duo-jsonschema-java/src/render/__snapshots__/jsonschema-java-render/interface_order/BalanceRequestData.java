package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class BalanceRequestData extends AbstractRequestData {
  public BalanceRequestData(
    @JsonProperty(value = "Username", required = true) String username,
    @JsonProperty(value = "Password", required = true) String password
  ) {
    super(username, password);
  }
}
