using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.ComponentModel.DataAnnotations;

namespace generated.omnigen
{
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    public class Out
    {
        [JsonProperty("success")]
        public bool Success { get; init; }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc response package
    /// </summary>
    public class JsonRpcResponse
    {
        [JsonProperty("id")]
        public string Id { get; init; }
        [JsonProperty("jsonrpc")]
        public string Jsonrpc { get; init; } = "2.0";
        [JsonProperty("result", Required = Required.Always)]
        [Required]
        public Out Result { get; init; }
    }

    public class Method2Response : JsonRpcResponse
    {

    }

    public class Method1Response : JsonRpcResponse
    {

    }

    /// <summary>
    /// Generic class to describe the JsonRpc request params
    /// </summary>
    public class JsonRpcRequestParams<T>
    {
        [JsonProperty("in")]
        public T In { get; init; }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc request package
    /// </summary>
    public class JsonRpcRequest<T0, TParams>
      where TParams : JsonRpcRequestParams<T0>
    {
        [JsonProperty("id")]
        public string Id { get; init; }
        [JsonProperty("jsonrpc")]
        [Required]
        public string Jsonrpc { get; init; } = "2.0";
        [JsonProperty("method", Required = Required.Always)]
        [Required]
        public string Method { get; init; }
        [JsonProperty("params")]
        public TParams Params { get; init; }

        public JsonRpcRequest(string method)
        {
            this.Method = method;
        }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc error inside an error response
    /// </summary>
    public class JsonRpcError
    {
        [JsonProperty("code")]
        public int Code { get; init; }
        [JsonProperty("data")]
        public JToken Data { get; init; }
        [JsonProperty("message")]
        public string Message { get; init; }

        public JsonRpcError(int? code, string message)
        {
            this.Code = code ?? -1;
            this.Message = message ?? "Unknown Error";
        }
    }

    public class ErrorUnknownError : JsonRpcError
    {
        public ErrorUnknownError(int? code, string message) : base(code ?? -1, message ?? "Unknown Error") { }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc error response package
    /// </summary>
    public class JsonRpcErrorResponse
    {
        [JsonProperty("error", Required = Required.Always)]
        [Required]
        public ErrorUnknownError Error { get; init; }
        [JsonProperty("id")]
        public string Id { get; init; }
        [JsonProperty("jsonrpc")]
        public string Jsonrpc { get; init; } = "2.0";
    }

    public class ErrorUnknown : JsonRpcErrorResponse
    {

    }

    public class Base<TX>
    {
        [JsonProperty("common")]
        public string Common { get; init; }
        [JsonProperty("description")]
        public string Description { get; init; }
        [JsonProperty("kind")]
        public string Kind { get; init; }
        [JsonProperty("x")]
        public TX X { get; init; }

        public Base(string kind)
        {
            this.Kind = kind;
        }
    }

    public class Object2 : Base<double>
    {
        [JsonProperty("b")]
        public string B { get; init; }

        public Object2() : base("2") { }
    }

    public class In2
    {
        [JsonProperty("data")]
        public Object2 Data { get; init; }
    }

    public class Method2RequestParams : JsonRpcRequestParams<In2>
    {

    }

    public class Method2Request : JsonRpcRequest<In2, Method2RequestParams>
    {
        public Method2Request() : base("Method2") { }
    }

    public class Object1 : Base<string>
    {
        [JsonProperty("a")]
        public string A { get; init; }

        public Object1() : base("1") { }
    }

    public class In1
    {
        [JsonProperty("data")]
        public Object1 Data { get; init; }
    }

    public class Method1RequestParams : JsonRpcRequestParams<In1>
    {

    }

    public class Method1Request : JsonRpcRequest<In1, Method1RequestParams>
    {
        public Method1Request() : base("Method1") { }
    }
}
