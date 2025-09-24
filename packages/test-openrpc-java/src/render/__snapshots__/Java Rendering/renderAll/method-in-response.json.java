

package generated.openrpc;

import jakarta.annotation.Generated;
import java.util.HashMap;
import java.util.Map;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
@SuppressWarnings("unused")
public class Models {
  public abstract static class AbstractRequestData {
    private final String password;
    private final String username;
    private Map<String, Object> additionalProperties = new HashMap<>();

    public AbstractRequestData(String username, String password) {
      this.username = username;
      this.password = password;
    }

    public void addAdditionalProperty(String key, Object value) {
      this.additionalProperties.put(key, value);
    }

    public Map<String, Object> getAdditionalProperties() {
      return this.additionalProperties;
    }

    public String getPassword() {
      return this.password;
    }

    public String getUsername() {
      return this.username;
    }
  }

  public static class AbstractResponseResult<TData> {
    private final TData data;
    private final String method;
    private final String signature;
    private final String uuid;

    public AbstractResponseResult(String signature, String uuid, String method, TData data) {
      this.signature = signature;
      this.uuid = uuid;
      this.method = method;
      this.data = data;
    }

    public TData getData() {
      return this.data;
    }

    public String getMethod() {
      return this.method;
    }

    public String getSignature() {
      return this.signature;
    }

    public String getUuid() {
      return this.uuid;
    }
  }

  public static class DepositRequest extends JsonRpcRequest<DepositRequestParams> {
    public DepositRequest(String id, DepositRequestParams params) {
      super(id, "Deposit", params);
    }
  }

  public static class DepositRequestData extends AbstractRequestData {
    private final String notificationUrl;

    public DepositRequestData(String username, String password, String notificationUrl) {
      super(username, password);
      this.notificationUrl = notificationUrl;
    }

    public String getNotificationURL() {
      return this.notificationUrl;
    }
  }

  public static class DepositRequestParams extends JsonRpcRequestParams<DepositRequestData> {
    public DepositRequestParams(String uuid, DepositRequestData data) {
      super(uuid, data);
    }
  }

  public static class DepositResponse extends JsonRpcResponse<DepositResponseResult> {
    public DepositResponse(String id, DepositResponseResult result) {
      super(id, result);
    }
  }

  public static class DepositResponseData {
    private final String orderid;
    private final String url;

    public DepositResponseData(String orderid, String url) {
      this.orderid = orderid;
      this.url = url;
    }

    public String getOrderid() {
      return this.orderid;
    }

    public String getUrl() {
      return this.url;
    }
  }

  public static class DepositResponseResult extends AbstractResponseResult<DepositResponseData> {
    public DepositResponseResult(String signature, String uuid, DepositResponseData data) {
      super(signature, uuid, "Deposit", data);
    }
  }

  public static class ErrorUnknown extends JsonRpcErrorResponse {
    public ErrorUnknown(ErrorUnknownError error, String id) {
      super(error, id);
    }
  }

  public static class ErrorUnknownError extends JsonRpcError {
    public ErrorUnknownError(Integer code, String message, Object data) {
      super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), data);
    }
  }

  /**
   * Generic class to describe the JsonRpc error inside an error response
   */
  public static class JsonRpcError {
    private final int code;
    private final Object data;
    private final String message;

    public JsonRpcError(Integer code, String message, Object data) {
      this.code = ((code == null) ? -1 : code);
      this.message = ((message == null) ? "Unknown Error" : message);
      this.data = data;
    }

    public int getCode() {
      return this.code;
    }

    public Object getData() {
      return this.data;
    }

    public String getMessage() {
      return this.message;
    }
  }

  /**
   * Generic class to describe the JsonRpc error response package
   */
  public static class JsonRpcErrorResponse {
    private final ErrorUnknownError error;
    private final String id;

    public JsonRpcErrorResponse(ErrorUnknownError error, String id) {
      this.error = error;
      this.id = id;
    }

    public ErrorUnknownError getError() {
      return this.error;
    }

    public String getId() {
      return this.id;
    }

    public String getJsonrpc() {
      return "2.0";
    }
  }

  /**
   * Generic class to describe the JsonRpc request package
   */
  public static class JsonRpcRequest<TParams extends JsonRpcRequestParams<? extends AbstractRequestData>> {
    private final String id;
    private final String method;
    private final TParams params;

    public JsonRpcRequest(String id, String method, TParams params) {
      this.id = id;
      this.method = method;
      this.params = params;
    }

    public String getId() {
      return this.id;
    }

    public String getJsonrpc() {
      return "2.0";
    }

    public String getMethod() {
      return this.method;
    }

    public TParams getParams() {
      return this.params;
    }
  }

  /**
   * Generic class to describe the JsonRpc request params
   */
  public static class JsonRpcRequestParams<T extends AbstractRequestData> {
    private final T data;
    private final String uuid;

    public JsonRpcRequestParams(String uuid, T data) {
      this.uuid = uuid;
      this.data = data;
    }

    public T getData() {
      return this.data;
    }

    public String getUUID() {
      return this.uuid;
    }
  }

  /**
   * Generic class to describe the JsonRpc response package
   */
  public static class JsonRpcResponse<T extends AbstractResponseResult<?>> {
    private final String id;
    private final T result;

    public JsonRpcResponse(String id, T result) {
      this.id = id;
      this.result = result;
    }

    public String getId() {
      return this.id;
    }

    public String getJsonrpc() {
      return "2.0";
    }

    public T getResult() {
      return this.result;
    }
  }

  public static class RefundRequest extends JsonRpcRequest<RefundRequestParams> {
    public RefundRequest(String id, RefundRequestParams params) {
      super(id, "Refund", params);
    }
  }

  public static class RefundRequestData extends AbstractRequestData {
    private final String amount;
    private final String orderId;

    public RefundRequestData(String username, String password, String orderId, String amount) {
      super(username, password);
      this.orderId = orderId;
      this.amount = amount;
    }

    public String getAmount() {
      return this.amount;
    }

    public String getOrderID() {
      return this.orderId;
    }
  }

  public static class RefundRequestParams extends JsonRpcRequestParams<RefundRequestData> {
    public RefundRequestParams(String uuid, RefundRequestData data) {
      super(uuid, data);
    }
  }

  public static class RefundResponse extends JsonRpcResponse<RefundResponseResult> {
    public RefundResponse(String id, RefundResponseResult result) {
      super(id, result);
    }
  }

  public static class RefundResponseData {
    private final String orderid;
    private final String result;

    public RefundResponseData(String orderid, String result) {
      this.orderid = orderid;
      this.result = result;
    }

    public String getOrderid() {
      return this.orderid;
    }

    public String getResult() {
      return this.result;
    }
  }

  public static class RefundResponseResult extends AbstractResponseResult<RefundResponseData> {
    public RefundResponseResult(String signature, String uuid, RefundResponseData data) {
      super(signature, uuid, "Refund", data);
    }
  }
}
