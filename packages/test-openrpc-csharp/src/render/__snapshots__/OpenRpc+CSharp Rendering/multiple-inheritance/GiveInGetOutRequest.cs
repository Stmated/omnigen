using Newtonsoft.Json.JsonPropertyAttribute;
using Newtonsoft.Json.Required;

namespace generated.omnigen
{
  /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
  public class GiveInGetOutRequest : JsonRpcRequest<GiveInGetOutRequestParams>
  {
    public GiveInGetOutRequest(string id, GiveInGetOutRequestParams @params) : base(id, @params, "give_in_get_out")
    {

    }
  }
  public class GiveInGetOutRequestParams : JsonRpcRequestParams
  {
    public GiveInGetOutRequestParams(In param) : base(param)
    {

    }
  }
  public class GiveInGetOutResponse : JsonRpcResponse<Out>
  {
    public GiveInGetOutResponse(string id, Out result) : base(id, result)
    {

    }
  }
  public class Out
  {
    [JsonProperty("result")]
    public string Result { get; }

    public Out(string result)
    {
      this.Result = result;
    }
  }
  /// <summary>
  /// Generic class to describe the JsonRpc error response package
  /// </summary>
  public class JsonRpcErrorResponse
  {
    [JsonProperty("error", Required = Required.Always)]
    public ErrorUnknownError Error { get; }
    [JsonProperty("id")]
    public string Id { get; }
    [JsonProperty("jsonrpc")]
    public string Jsonrpc { get; } = "2.0";

    public JsonRpcErrorResponse(ErrorUnknownError error, string id)
    {
      this.Error = error;
      this.Id = id;
    }
  }
  public class ErrorUnknown : JsonRpcErrorResponse
  {
    public ErrorUnknown(ErrorUnknownError error, string id) : base(error, id)
    {

    }
  }
  public class GiveInGetOut2Request : JsonRpcRequest<GiveInGetOut2RequestParams>
  {
    public GiveInGetOut2Request(string id, GiveInGetOut2RequestParams @params) : base(id, @params, "give_in_get_out2")
    {

    }
  }
  public class GiveInGetOut2RequestParams : JsonRpcRequestParams
  {
    public GiveInGetOut2RequestParams(In param) : base(param)
    {

    }
  }
  public class GiveInGetOut2Response : JsonRpcResponse<Out2>
  {
    public GiveInGetOut2Response(string id, Out2 result) : base(id, result)
    {

    }
  }
  public class Out2 : A, IB, IC
  {
    [JsonProperty("bar")]
    public string Bar { get; }
    [JsonProperty("xyz")]
    public string Xyz { get; }

    public Out2(string kind, string foo, string bar, string xyz) : base(kind, foo)
    {
      this.Bar = bar;
      this.Xyz = xyz;
    }
  }
  /// <summary>
  /// Generic class to describe the JsonRpc request package
  /// </summary>
  public class JsonRpcRequest<TParams>
    where TParams : JsonRpcRequestParams
  {
    [JsonProperty("params")]
    public TParams @params { get; }
    [JsonProperty("id", Required = Required.Always)]
    public string Id { get; }
    [JsonProperty("jsonrpc")]
    public string Jsonrpc { get; } = "2.0";
    [JsonProperty("method", Required = Required.Always)]
    public string Method { get; }

    public JsonRpcRequest(string id, TParams @params, string method)
    {
      this.Id = id;
      this.@params = @params;
      this.Method = method;
    }
  }
  /// <summary>
  /// Generic class to describe the JsonRpc response package
  /// </summary>
  public class JsonRpcResponse<T>
  {
    [JsonProperty("id")]
    public string Id { get; }
    [JsonProperty("jsonrpc")]
    public string Jsonrpc { get; } = "2.0";
    [JsonProperty("result")]
    public T Result { get; }

    public JsonRpcResponse(string id, T result)
    {
      this.Id = id;
      this.Result = result;
    }
  }
  /// <summary>
  /// Generic class to describe the JsonRpc error inside an error response
  /// </summary>
  public class JsonRpcError
  {
    [JsonProperty("code")]
    public int? Code { get; }
    [JsonProperty("data")]
    public dynamic Data { get; }
    [JsonProperty("message")]
    public string Message { get; }

    public JsonRpcError(int? code, string message, dynamic data)
    {
      this.Code = ((code == null) ? -1 : code);
      this.Message = ((message == null) ? "Unknown Error" : message);
      this.Data = data;
    }
  }
  public class ErrorUnknownError : JsonRpcError
  {
    public ErrorUnknownError(int? code, string message, dynamic data) : base(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), ((object) data))
    {

    }
  }
  /// <summary>
  /// Generic class to describe the JsonRpc request params
  /// </summary>
  public class JsonRpcRequestParams
  {
    [JsonProperty("param")]
    public In Param { get; }

    public JsonRpcRequestParams(In param)
    {
      this.Param = param;
    }
  }
  public class Abs
  {
    [JsonProperty("kind")]
    public string Kind { get; }

    public Abs(string kind)
    {
      this.Kind = kind;
    }
  }
  public class A : Abs
  {
    [JsonProperty("foo")]
    public string Foo { get; }

    public A(string kind, string foo) : base(kind)
    {
      this.Foo = foo;
    }
  }
  public interface IB
  {
    string Bar { get; }
  }

  public interface IC
  {
    string Xyz { get; }
  }

  public class UnionOfAB
  {
    private A _a;
    private B _b;

    public UnionOfAB(dynamic raw)
    {
      this.Raw = raw;
    }

    public A getA(Func<dynamic, A> transformer)
    {
      if (this._a != null)
      {
        return this._a;
      }
      return this._a = transformer(this.Raw);
    }

    public B getB(Func<dynamic, B> transformer)
    {
      if (this._b != null)
      {
        return this._b;
      }
      return this._b = transformer(this.Raw);
    }

    public dynamic Raw { get; }
  }
  public class B : Abs, IB
  {
    [JsonProperty("bar")]
    public string Bar { get; }

    public B(string kind, string bar) : base(kind)
    {
      this.Bar = bar;
    }
  }
  public class In : UnionOfAB
  {
    [JsonProperty("in_type")]
    public string InType { get; }

    public In(dynamic raw, string inType) : base(((object) raw))
    {
      this.InType = inType;
    }
  }
  public class C : Abs, IC
  {
    [JsonProperty("xyz")]
    public string Xyz { get; }

    public C(string kind, string xyz) : base(kind)
    {
      this.Xyz = xyz;
    }
  }
}
