package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractRequestData {
  @JsonProperty(value = "Password", required = true)
  @JsonInclude
  private final String password;
  @JsonProperty(value = "Username", required = true)
  @JsonInclude
  private final String username;

  public AbstractRequestData(
    @JsonProperty(value = "Username", required = true) String username,
    @JsonProperty(value = "Password", required = true) String password
  ) {
    this.username = username;
    this.password = password;
  }

  public String getPassword() {
    return this.password;
  }

  public String getUsername() {
    return this.username;
  }
}
