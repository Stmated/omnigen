package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractRequestData {
  private final String password;
  private final String username;

  public AbstractRequestData(String username, String password) {
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
