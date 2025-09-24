

package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List API versions
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetVersionsRequest extends JsonRpcRequest<GetVersionsRequestParams> {
  public GetVersionsRequest(String id, GetVersionsRequestParams params) {
    super(id, "get_versions", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams extends JsonRpcRequestParams> {
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


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetVersionsRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * List API versions
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetVersionsResponse extends JsonRpcResponse<GetVersionResult> {
  public GetVersionsResponse(String id, GetVersionResult result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse<T> {
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


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <hr />
 * <strong>Example #1</strong> - aight so this is how it works. You foo the bar then you baz the razmataz - its a v2 example pairing!
 * <p>
 *   <p><strong>📤 Response</strong> - versionsExample
 *   <pre>{@code {
 *     "versions": [
 *       {
 *         "status": "CURRENT",
 *         "updated": "2011-01-21T11:33:21Z",
 *         "id": "v2.0",
 *         "urls": [
 *           {
 *             "href": "http://127.0.0.1:8774/v2/",
 *             "rel": "self"
 *           }
 *         ]
 *       },
 *       {
 *         "status": "EXPERIMENTAL",
 *         "updated": "2013-07-23T11:33:21Z",
 *         "id": "v3.0",
 *         "urls": [
 *           {
 *             "href": "http://127.0.0.1:8774/v3/",
 *             "rel": "self"
 *           }
 *         ]
 *       }
 *     ]
 *   }}</pre>
 *   </p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetVersionResult {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
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


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(Integer code, String message, Object data) {
    super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), data);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcErrorResponse {
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


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse {
  public ErrorUnknown(ErrorUnknownError error, String id) {
    super(error, id);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Show API version details
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetVersionDetailsRequest extends JsonRpcRequest<GetVersionDetailsRequestParams> {
  public GetVersionDetailsRequest(String id, GetVersionDetailsRequestParams params) {
    super(id, "get_version_details", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetVersionDetailsRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Show API version details
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetVersionDetailsResponse extends JsonRpcResponse<String> {
  public GetVersionDetailsResponse(String id, String result) {
    super(id, result);
  }
}
