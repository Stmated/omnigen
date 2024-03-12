package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Container {
  private final String dateOfBirth;
  public Container(@JsonProperty("dateOfBirth") String dateOfBirth) {
    this.dateOfBirth = dateOfBirth;
  }

  /**
   * Date string in the ISO 8601 format (YYYY-MM-DD), Date of birth (YYYY-MM-DD, ISO 8601) of the beneficiary, or organisational number for the organisation.
   * <h5>Examples</h5>
   * <ul>
   *   <li>2014-04-01</li>
   * </ul>
   */
  public String getDateOfBirth() {
    return this.dateOfBirth;
  }
}
