using Newtonsoft.Json;

namespace generated.omnigen
{
  /// <summary>
  /// Generic class to describe the JsonRpc request package
  /// </summary>
  public class JsonRpcRequest
  {
    [JsonProperty("params")]
    public ListThingsRequestParams @params { get; }
    [JsonProperty("id", Required = Required.Always)]
    public string Id { get; }
    [JsonProperty("jsonrpc")]
    public string Jsonrpc { get; } = "2.0";
    [JsonProperty("method")]
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
    public ListThingsRequest(ListThingsRequestParams @params, string id) : base(@params, id) { }
  }
  /// <summary>
  /// Generic class to describe the JsonRpc response package
  /// </summary>
  public class JsonRpcResponse
  {
    [JsonProperty("id")]
    public string Id { get; }
    [JsonProperty("jsonrpc")]
    public string Jsonrpc { get; } = "2.0";
    [JsonProperty("result")]
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
    public ListThingsResponse(string id, Thing[] result) : base(id, result) { }
  }
  public class ListThingsError100 : JsonRpcErrorResponse<ListThingsError100Error>
  {
    public ListThingsError100(string id, ListThingsError100Error error) : base(id, error) { }
  }
  public class ListThingsError100Error : JsonRpcError
  {
    public ListThingsError100Error(dynamic data, string message) : base(((object) data), 100, message ?? "Server is busy") { }
  }
  public class ErrorUnknown : JsonRpcErrorResponse<ErrorUnknownError>
  {
    public ErrorUnknown(string id, ErrorUnknownError error) : base(id, error) { }
  }
  public class ErrorUnknownError : JsonRpcError
  {
    public ErrorUnknownError(dynamic data, int? code, string message) : base(((object) data), code ?? -1, message ?? "Unknown Error") { }
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
    [JsonProperty("error", Required = Required.Always)]
    public T Error { get; }
    [JsonProperty("id")]
    public string Id { get; }
    [JsonProperty("jsonrpc")]
    public string Jsonrpc { get; } = "2.0";

    public JsonRpcErrorResponse(string id, T error)
    {
      this.Id = id;
      this.Error = error;
    }
  }
  public class Thing
  {
    [JsonProperty("id", Required = Required.Always)]
    public string Id { get; }
    /// <see cref="Tag" />
    [JsonProperty("tag")]
    public string Tag { get; }
    /// <see cref="ThingType" />
    [JsonProperty("type")]
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
    [JsonProperty("code")]
    public int Code { get; }
    [JsonProperty("data")]
    public dynamic Data { get; }
    [JsonProperty("message")]
    public string Message { get; }

    public JsonRpcError(dynamic data, int code, string message)
    {
      this.Data = data;
      this.Code = code;
      this.Message = message;
    }
  }
}
