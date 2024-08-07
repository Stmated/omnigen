package generated.omnigen;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.experimental.NonFinal;
import lombok.experimental.SuperBuilder;
import lombok.extern.jackson.Jacksonized;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.With;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@NonFinal
@SuperBuilder(toBuilder = true)
@Jacksonized
@NoArgsConstructor
@RequiredArgsConstructor
@Value
@With
public class In extends UnionOfAB {
  @JsonProperty(value = "in_type")
  String inType;
}
