package some.other.pkg;

import java.util.List;
import some.base.pkg.JsonRpcResponse;

/**
 * An array of things
 */
public class ListThingsResponse extends JsonRpcResponse {
  public ListThingsResponse(String id, List<Thing> result) {
    super(id, result);
  }
}
