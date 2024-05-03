namespace generated.omnigen
{
  /// <summary>
  /// Generic class to describe the JsonRpc request package
  /// </summary>
  public class JsonRpcRequest
  {
    public ListThingsRequestParams @params { get; }
    public string Id { get; }
    public string Jsonrpc { get; } = "2.0";
    public string Method { get; } = "list_things";

    public JsonRpcRequest(ListThingsRequestParams @params, string id)
    {
      this.@params = @params;
      this.Id = id;
    }
  }
  /// <summary>
  /// List all things
  /// </summary>
  public class ListThingsRequest : JsonRpcRequest
  {
    public ListThingsRequest(ListThingsRequestParams @params, string id) : base(@params, id)
    {

    }
  }
  /// <summary>
  /// Generic class to describe the JsonRpc response package
  /// </summary>
  public class JsonRpcResponse
  {
    public string Id { get; }
    public string Jsonrpc { get; } = "2.0";
    public Thing[] Result { get; }

    public JsonRpcResponse(string id, Thing[] result)
    {
      this.Id = id;
      this.Result = result;
    }
  }
  /// <summary>
  /// List all things
  /// </summary>
  /// <p>As response: An array of things</p>
  public class ListThingsResponse : JsonRpcResponse
  {
    public ListThingsResponse(string id, Thing[] result) : base(id, result)
    {

    }
  }
  public class ListThingsError100 : JsonRpcErrorResponse<ListThingsError100Error>
  {
    public ListThingsError100(string id, ListThingsError100Error error) : base(id, error)
    {

    }
  }
  public class ListThingsError100Error : JsonRpcError
  {
    public ListThingsError100Error(dynamic data, string message) : base(((object) data), 100, ((message == null) ? "Server is busy" : message))
    {

    }
  }
  public class ErrorUnknown : JsonRpcErrorResponse<ErrorUnknownError>
  {
    public ErrorUnknown(string id, ErrorUnknownError error) : base(id, error)
    {

    }
  }
  public class ErrorUnknownError : JsonRpcError
  {
    public ErrorUnknownError(dynamic data, int? code, string message) : base(((object) data), ((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message))
    {

    }
  }
  /// <summary>
  /// Generic class to describe the JsonRpc request params
  /// </summary>
  public class JsonRpcRequestParams
  {

  }
  public class ListThingsRequestParams : JsonRpcRequestParams
  {

  }
  /// <summary>
  /// Generic class to describe the JsonRpc error response package
  /// </summary>
  public class JsonRpcErrorResponse<T>
    where T : JsonRpcError
  {
    public T Error { get; }
    public string Id { get; }
    public string Jsonrpc { get; } = "2.0";

    public JsonRpcErrorResponse(string id, T error)
    {
      this.Id = id;
      this.Error = error;
    }
  }
  public class Thing
  {
    public string Id { get; }
    /// <see cref="Tag" />
    public string Tag { get; }
    /// <see cref="ThingType" />
    public string Type { get; }

    public Thing(string id, string type, string tag)
    {
      this.Id = id;
      this.Type = type;
      this.Tag = tag;
    }
  }
  public static class ThingType
  {
    public const string TYPE_A = "TypeA";
    public const string TYPE_B = "TypeB";
    public const string TYPE_C = "TypeC";
  }
  public static class Tag
  {
    public const string TAG_A = "TagA";
    public const string TAG_B = "TagB";
    public const string TAG_C = "TagC";
  }
  /// <summary>
  /// Generic class to describe the JsonRpc error inside an error response
  /// </summary>
  public class JsonRpcError
  {
    public int Code { get; }
    public dynamic Data { get; }
    public string Message { get; }

    public JsonRpcError(dynamic data, int code, string message)
    {
      this.Data = data;
      this.Code = code;
      this.Message = message;
    }
  }
}
