package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
@SuppressWarnings("unused")
public class description_inheritance {
  /**
   * components_schemas_ResultSchema_description
   * <p>
   * components_schemas_AbstractOne_description
   */
  public static class AbstractOne extends AbstractOneWithAbstractOnePropertyA {
    public AbstractOne(Integer abstractOnePropertyA, String abstractOnePropertyB) {
      super(abstractOnePropertyA, abstractOnePropertyB);
    }
  }

  /**
   * components_schemas_AbstractOne_allOf_inline_description
   */
  public static class AbstractOneWithAbstractOnePropertyA {
    private final Integer abstractOnePropertyA;
    private final String abstractOnePropertyB;

    public AbstractOneWithAbstractOnePropertyA(Integer abstractOnePropertyA, String abstractOnePropertyB) {
      this.abstractOnePropertyA = abstractOnePropertyA;
      this.abstractOnePropertyB = abstractOnePropertyB;
    }

    /**
     * components_schemas_NumberOrNull_description
     * <p>
     * components_schemas_NumberSchema_OneOf_Number_description
     */
    public Integer getAbstractOnePropertyA() {
      return this.abstractOnePropertyA;
    }

    /**
     * components_schemas_AbstractOne_properties_AbstractOnePropertyB_description
     */
    public String getAbstractOnePropertyB() {
      return this.abstractOnePropertyB;
    }
  }

  /**
   * components_schemas_AbstractOther_description
   */
  public static class AbstractOther extends AbstractOne {
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
  public static class JsonRpcRequest {
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

  /**
   * Generic class to describe the JsonRpc request params
   */
  public static class JsonRpcRequestParams {
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

  /**
   * Generic class to describe the JsonRpc response package
   */
  public static class JsonRpcResponse {
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

  /**
   * methods_method_description
   */
  public static class MethodRequest extends JsonRpcRequest {
    public MethodRequest(MethodRequestParams params, String id) {
      super(params, id);
    }
  }

  public static class MethodRequestParams extends JsonRpcRequestParams {
    public MethodRequestParams(RequestParamDescriptor requestParamDescriptor) {
      super(requestParamDescriptor);
    }
  }

  /**
   * methods_method_description
   * <p>As response: components_contentDescriptors_ResultDescriptor_description</p>
   */
  public static class MethodResponse extends JsonRpcResponse {
    public MethodResponse(String id, ResultDescriptor result) {
      super(id, result);
    }
  }

  /**
   * components_contentDescriptors_RequestParamDescriptor_schema_description
   */
  public static class RequestParamDescriptor extends RequestParamSchema {
    public RequestParamDescriptor(
      Integer abstractOnePropertyA,
      String abstractOnePropertyB,
      String abstractOtherPropertyB,
      Integer abstractOtherPropertyA
    ) {
      super(abstractOnePropertyA, abstractOnePropertyB, abstractOtherPropertyB, abstractOtherPropertyA);
    }
  }

  public static class RequestParamSchema extends AbstractOther {
    public RequestParamSchema(
      Integer abstractOnePropertyA,
      String abstractOnePropertyB,
      String abstractOtherPropertyB,
      Integer abstractOtherPropertyA
    ) {
      super(abstractOnePropertyA, abstractOnePropertyB, abstractOtherPropertyB, abstractOtherPropertyA);
    }
  }

  /**
   * components_contentDescriptors_ResultDescriptor_schema_description
   */
  public static class ResultDescriptor extends ResultSchema {
    public ResultDescriptor(Integer abstractOnePropertyA, String abstractOnePropertyB, String resultSchemaPropertyA) {
      super(abstractOnePropertyA, abstractOnePropertyB, resultSchemaPropertyA);
    }
  }

  /**
   * components_schemas_ResultSchema_description
   */
  public static class ResultSchema extends AbstractOne {
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
}
