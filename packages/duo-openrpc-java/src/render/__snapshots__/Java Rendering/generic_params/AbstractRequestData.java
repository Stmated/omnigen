package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractRequestData<T> {
  private final T attributes;
  private final String password;
  private final String username;
  public AbstractRequestData(String username, String password, T attributes) {
    this.username = username;
    this.password = password;
    this.attributes = attributes;
  }

  @JsonProperty("Attributes")
  public T getAttributes() {
    return this.attributes;
  }

  @JsonProperty(value = "Password", required = true)
  @JsonInclude(Include.ALWAYS)
  public String getPassword() {
    return this.password;
  }

  @JsonProperty(value = "Username", required = true)
  @JsonInclude(Include.ALWAYS)
  public String getUsername() {
    return this.username;
  }
}
