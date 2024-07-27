package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class RequestData {
  @JsonProperty(value = "senderInformation")
  private final SenderInformation senderInformation;

  public RequestData(@JsonProperty(value = "senderInformation") SenderInformation senderInformation) {
    this.senderInformation = senderInformation;
  }

  public SenderInformation getSenderInformation() {
    return this.senderInformation;
  }

  public static class SenderInformation {
    @JsonProperty(value = "DateOfBirth")
    private final String dateOfBirth;

    public SenderInformation(@JsonProperty(value = "DateOfBirth") String dateOfBirth) {
      this.dateOfBirth = dateOfBirth;
    }

    /**
     * A description
     * <p>
     * Date string in the ISO 8601 format (YYYY-MM-DD), An organization number
     * <h2>Examples</h2>
     * <ul>
     *   <li>2014-04-01</li>
     * </ul>
     */
    public String getDateOfBirth() {
      return this.dateOfBirth;
    }
  }
}
