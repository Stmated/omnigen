using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.ComponentModel.DataAnnotations;

namespace generated.omnigen
{
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    public class A : Abs
    {
        [JsonProperty("a")]
        public string A { get; }
        [JsonProperty("x")]
        public string X { get; }

        public A(string kind, string common, string a, string x) : base(kind, common)
        {
            this.A = a;
            this.X = x;
        }
    }

    public class Abs
    {
        [JsonProperty("common")]
        public string Common { get; }
        [JsonProperty("kind")]
        public string Kind { get; }

        public Abs(string kind, string common)
        {
            this.Kind = kind;
            this.Common = common;
        }
    }

    public class B : Abs
    {
        [JsonProperty("b")]
        public string B { get; }
        [JsonProperty("x")]
        public double X { get; }

        public B(string kind, string common, string b, double x) : base(kind, common)
        {
            this.B = b;
            this.X = x;
        }
    }

    public class ErrorUnknown : JsonRpcErrorResponse
    {
        public ErrorUnknown(ErrorUnknownError error, string id) : base(error, id) { }
    }

    public class ErrorUnknownError : JsonRpcError
    {
        public ErrorUnknownError(int? code, string message, JToken data) : base(code ?? -1, message ?? "Unknown Error", data) { }
    }

    public class GiveIn1GetOut1Request : JsonRpcRequest
    {
        [JsonProperty("params")]
        public GiveIn1GetOut1RequestParams Params { get; }

        public GiveIn1GetOut1Request(string id, GiveIn1GetOut1RequestParams @params) : base(id, "give_in1_get_out1")
        {
            this.Params = @params;
        }
    }

    public class GiveIn1GetOut1RequestParams : JsonRpcRequestParams
    {
        [JsonProperty("param")]
        public In1 Param { get; }

        public GiveIn1GetOut1RequestParams(In1 param)
        {
            this.Param = param;
        }
    }

    public class GiveIn1GetOut1Response : JsonRpcResponse
    {
        [JsonProperty("result")]
        public A Result { get; }

        public GiveIn1GetOut1Response(string id, A result) : base(id)
        {
            this.Result = result;
        }
    }

    public class GiveIn2GetOut2Request : JsonRpcRequest
    {
        [JsonProperty("params")]
        public GiveIn2GetOut2RequestParams Params { get; }

        public GiveIn2GetOut2Request(string id, GiveIn2GetOut2RequestParams @params) : base(id, "give_in2_get_out2")
        {
            this.Params = @params;
        }
    }

    public class GiveIn2GetOut2RequestParams : JsonRpcRequestParams
    {
        [JsonProperty("param")]
        public In2 Param { get; }

        public GiveIn2GetOut2RequestParams(In2 param)
        {
            this.Param = param;
        }
    }

    public class GiveIn2GetOut2Response : JsonRpcResponse
    {
        [JsonProperty("result")]
        public B Result { get; }

        public GiveIn2GetOut2Response(string id, B result) : base(id)
        {
            this.Result = result;
        }
    }

    public class In1
    {
        [JsonProperty("value")]
        public string Value { get; }

        public In1(string value)
        {
            this.Value = value;
        }
    }

    public class In2
    {
        [JsonProperty("value")]
        public string Value { get; }

        public In2(string value)
        {
            this.Value = value;
        }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc error inside an error response
    /// </summary>
    public class JsonRpcError
    {
        [JsonProperty("code")]
        public int Code { get; }
        [JsonProperty("data")]
        public JToken Data { get; }
        [JsonProperty("message")]
        public string Message { get; }

        public JsonRpcError(int? code, string message, JToken data)
        {
            this.Code = code ?? -1;
            this.Message = message ?? "Unknown Error";
            this.Data = data;
        }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc error response package
    /// </summary>
    public class JsonRpcErrorResponse
    {
        [JsonProperty("error", Required = Required.Always, NullValueHandling = NullValueHandling.Include)]
        [Required]
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

    /// <summary>
    /// Generic class to describe the JsonRpc request package
    /// </summary>
    public class JsonRpcRequest
    {
        [JsonProperty("id")]
        public string Id { get; }
        [JsonProperty("jsonrpc", NullValueHandling = NullValueHandling.Include)]
        [Required]
        public string Jsonrpc { get; } = "2.0";
        [JsonProperty("method", Required = Required.Always, NullValueHandling = NullValueHandling.Include)]
        [Required]
        public string Method { get; }

        public JsonRpcRequest(string id, string method)
        {
            this.Id = id;
            this.Method = method;
        }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc request params
    /// </summary>
    public class JsonRpcRequestParams
    {

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

        public JsonRpcResponse(string id)
        {
            this.Id = id;
        }
    }
}
