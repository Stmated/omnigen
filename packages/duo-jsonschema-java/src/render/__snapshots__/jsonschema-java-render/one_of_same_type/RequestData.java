package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class RequestData {
  private final SenderInformation senderInformation;
  public RequestData(@JsonProperty("senderInformation") SenderInformation senderInformation) {
    this.senderInformation = senderInformation;
  }

  public SenderInformation getSenderInformation() {
    return this.senderInformation;
  }

  @Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
  public static class SenderInformation {
    private final String dateOfBirth;
    public SenderInformation(@JsonProperty("DateOfBirth") String dateOfBirth) {
      this.dateOfBirth = dateOfBirth;
    }

    /**
     * Date string in the ISO 8601 format (YYYY-MM-DD), A description, An organization number
     * <h5>Examples</h5>
     * <ul>
     *   <li>2014-04-01</li>
     * </ul>
     */
    @JsonProperty("DateOfBirth")
    public String getDateOfBirth() {
      return this.dateOfBirth;
    }
  }
}
