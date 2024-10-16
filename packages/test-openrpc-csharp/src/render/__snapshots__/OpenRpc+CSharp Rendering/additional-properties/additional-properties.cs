using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace generated.omnigen
{
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    public class Thing
    {
        [JsonExtensionData]
        public JObject AdditionalProperties { get; }
        [JsonProperty("id", Required = Required.Always)]
        [Required]
        public string Id { get; }

        public Thing(string id, JObject additionalProperties)
        {
            this.Id = id;
            this.AdditionalProperties = additionalProperties;
        }
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
        [JsonProperty("result", Required = Required.Always)]
        [Required]
        public IList<Thing> Result { get; }

        public JsonRpcResponse(string id, IList<Thing> result)
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
        public ListThingsResponse(string id, IList<Thing> result) : base(id, result) { }
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
    /// Generic class to describe the JsonRpc request package
    /// </summary>
    public class JsonRpcRequest
    {
        [JsonProperty("id")]
        public string Id { get; }
        [JsonProperty("jsonrpc")]
        [Required]
        public string Jsonrpc { get; } = "2.0";
        [JsonProperty("method")]
        [Required]
        public string Method { get; } = "list_things";
        [JsonProperty("params")]
        public ListThingsRequestParams Params { get; }

        public JsonRpcRequest(ListThingsRequestParams @params, string id)
        {
            this.Params = @params;
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

    public class ErrorUnknownError : JsonRpcError
    {
        public ErrorUnknownError(int? code, string message, JToken data) : base(code ?? -1, message ?? "Unknown Error", data) { }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc error response package
    /// </summary>
    public class JsonRpcErrorResponse
    {
        [JsonProperty("error", Required = Required.Always)]
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

    public class ErrorUnknown : JsonRpcErrorResponse
    {
        public ErrorUnknown(ErrorUnknownError error, string id) : base(error, id) { }
    }
}
