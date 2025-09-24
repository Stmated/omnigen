

package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_schemas_AbstractOne_allOf_inline_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractOneWithAbstractOnePropertyA {
  private final Integer abstractOnePropertyA;

  public AbstractOneWithAbstractOnePropertyA(Integer abstractOnePropertyA) {
    this.abstractOnePropertyA = abstractOnePropertyA;
  }

  /**
   * components_schemas_NumberOrNull_description
   * <p>
   * components_schemas_NumberSchema_OneOf_Number_description
   */
  public Integer getAbstractOnePropertyA() {
    return this.abstractOnePropertyA;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_schemas_ResultSchema_description
 * <p>
 * components_schemas_AbstractOne_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractOne extends AbstractOneWithAbstractOnePropertyA {
  private final String abstractOnePropertyB;

  public AbstractOne(Integer abstractOnePropertyA, String abstractOnePropertyB) {
    super(abstractOnePropertyA);
    this.abstractOnePropertyB = abstractOnePropertyB;
  }

  /**
   * components_schemas_AbstractOne_properties_AbstractOnePropertyB_description
   */
  public String getAbstractOnePropertyB() {
    return this.abstractOnePropertyB;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_contentDescriptors_RequestParamDescriptor_schema_description
 * <p>
 * components_schemas_AbstractOther_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class AbstractOther extends AbstractOne {
  private final String abstractOtherPropertyB;
  private Integer abstractOtherPropertyA;

  public AbstractOther(
    Integer abstractOnePropertyA,
    String abstractOnePropertyB,
    String abstractOtherPropertyB,
    Integer abstractOtherPropertyA
  ) {
    super(abstractOnePropertyA, abstractOnePropertyB);
    this.abstractOtherPropertyB = abstractOtherPropertyB;
    this.abstractOtherPropertyA = abstractOtherPropertyA;
  }

  /**
   * components_schemas_AbstractOther_allOf_AbstractOtherPropertyA_description
   */
  public Integer getAbstractOtherPropertyA() {
    return this.abstractOtherPropertyA;
  }

  /**
   * components_schemas_AbstractOne_properties_AbstractOtherPropertyB_description
   */
  public String getAbstractOtherPropertyB() {
    return this.abstractOtherPropertyB;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_contentDescriptors_RequestParamDescriptor_schema_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class RequestParamDescriptor extends AbstractOther {
  public RequestParamDescriptor(
    Integer abstractOnePropertyA,
    String abstractOnePropertyB,
    String abstractOtherPropertyB,
    Integer abstractOtherPropertyA
  ) {
    super(abstractOnePropertyA, abstractOnePropertyB, abstractOtherPropertyB, abstractOtherPropertyA);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {
  private final RequestParamDescriptor requestParamDescriptor;

  public JsonRpcRequestParams(RequestParamDescriptor requestParamDescriptor) {
    this.requestParamDescriptor = requestParamDescriptor;
  }

  /**
   * components_contentDescriptors_RequestParamDescriptor_schema_description
   */
  public RequestParamDescriptor getRequestParamDescriptor() {
    return this.requestParamDescriptor;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class MethodRequestParams extends JsonRpcRequestParams {
  public MethodRequestParams(RequestParamDescriptor requestParamDescriptor) {
    super(requestParamDescriptor);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest {
  private final String id;
  private final MethodRequestParams params;

  public JsonRpcRequest(MethodRequestParams params, String id) {
    this.params = params;
    this.id = id;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public String getMethod() {
    return "method";
  }

  public MethodRequestParams getParams() {
    return this.params;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * methods_method_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class MethodRequest extends JsonRpcRequest {
  public MethodRequest(MethodRequestParams params, String id) {
    super(params, id);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_contentDescriptors_ResultDescriptor_schema_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ResultDescriptor extends AbstractOne {
  private String resultSchemaPropertyA;

  public ResultDescriptor(Integer abstractOnePropertyA, String abstractOnePropertyB, String resultSchemaPropertyA) {
    super(abstractOnePropertyA, abstractOnePropertyB);
    this.resultSchemaPropertyA = resultSchemaPropertyA;
  }

  /**
   * components_schemas_ResultSchema_allOf_inline_properties_ResultSchemaPropertyA_description
   */
  public String getResultSchemaPropertyA() {
    return this.resultSchemaPropertyA;
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
  private final ResultDescriptor result;

  public JsonRpcResponse(String id, ResultDescriptor result) {
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
   * components_contentDescriptors_ResultDescriptor_schema_description
   */
  public ResultDescriptor getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * methods_method_description
 * <p>As response: components_contentDescriptors_ResultDescriptor_description</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class MethodResponse extends JsonRpcResponse {
  public MethodResponse(String id, ResultDescriptor result) {
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
public class RequestParamSchema extends AbstractOther {
  public RequestParamSchema(
    Integer abstractOnePropertyA,
    String abstractOnePropertyB,
    String abstractOtherPropertyB,
    Integer abstractOtherPropertyA
  ) {
    super(abstractOnePropertyA, abstractOnePropertyB, abstractOtherPropertyB, abstractOtherPropertyA);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * components_schemas_ResultSchema_description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ResultSchema extends AbstractOne {
  private String resultSchemaPropertyA;

  public ResultSchema(Integer abstractOnePropertyA, String abstractOnePropertyB, String resultSchemaPropertyA) {
    super(abstractOnePropertyA, abstractOnePropertyB);
    this.resultSchemaPropertyA = resultSchemaPropertyA;
  }

  /**
   * components_schemas_ResultSchema_allOf_inline_properties_ResultSchemaPropertyA_description
   */
  public String getResultSchemaPropertyA() {
    return this.resultSchemaPropertyA;
  }
}
