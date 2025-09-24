

package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AdditionRequest extends JsonRpcRequest<AdditionRequestParams> {
  public AdditionRequest(String id, AdditionRequestParams params) {
    super(id, "addition", params);
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
  private final int a;
  private final int b;

  public JsonRpcRequestParams(int a, int b) {
    this.a = a;
    this.b = b;
  }

  /**
   * <hr />
   * <strong>Example #1</strong> - simpleMathAdditionTwo
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say four
   *   💡 its a sample four
   *   <pre>{@code 4}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #2</strong> - simpleMathAdditionFour
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say eight
   *   💡 its a sample eight
   *   <pre>{@code 8}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #3</strong> - examplesSubtractFourTwo
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say two
   *   💡 its a sample two
   *   <pre>{@code 2}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #4</strong> - examplesSubtractEightFour
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say four
   *   💡 its a sample four
   *   <pre>{@code 4}</pre>
   *   </p>
   */
  public int getA() {
    return this.a;
  }

  /**
   * <hr />
   * <strong>Example #1</strong> - simpleMathAdditionTwo
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say four
   *   💡 its a sample four
   *   <pre>{@code 4}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #2</strong> - simpleMathAdditionFour
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say eight
   *   💡 its a sample eight
   *   <pre>{@code 8}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #3</strong> - examplesSubtractFourTwo
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say two
   *   💡 its a sample two
   *   <pre>{@code 2}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #4</strong> - examplesSubtractEightFour
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say four
   *   💡 its a sample four
   *   <pre>{@code 4}</pre>
   *   </p>
   */
  public int getB() {
    return this.b;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AdditionRequestParams extends JsonRpcRequestParams {
  public AdditionRequestParams(int a, int b) {
    super(a, b);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse {
  private final String id;
  private final int result;

  public JsonRpcResponse(String id, int result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  /**
   * <hr />
   * <strong>Example #1</strong> - simpleMathAdditionTwo
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say four
   *   💡 its a sample four
   *   <pre>{@code 4}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #2</strong> - simpleMathAdditionFour
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say eight
   *   💡 its a sample eight
   *   <pre>{@code 8}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #3</strong> - examplesSubtractFourTwo
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say two
   *   💡 its a sample two
   *   <pre>{@code 2}</pre>
   *   </p>
   * <p>
   * <hr />
   * <strong>Example #4</strong> - examplesSubtractEightFour
   * <p>
   *   <p><strong>📤 Response</strong> - Im not sure how else to say four
   *   💡 its a sample four
   *   <pre>{@code 4}</pre>
   *   </p>
   */
  public int getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AdditionResponse extends JsonRpcResponse {
  public AdditionResponse(String id, int result) {
    super(id, result);
  }
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

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SubtractionRequest extends JsonRpcRequest<SubtractionRequestParams> {
  public SubtractionRequest(String id, SubtractionRequestParams params) {
    super(id, "subtraction", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SubtractionRequestParams extends JsonRpcRequestParams {
  public SubtractionRequestParams(int a, int b) {
    super(a, b);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SubtractionResponse extends JsonRpcResponse {
  public SubtractionResponse(String id, int result) {
    super(id, result);
  }
}
