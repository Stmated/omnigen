using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Runtime.Serialization;

namespace generated.omnigen
{
    [JsonConverter(typeof(StringEnumConverter))]
    public enum ThingType
    {
        [EnumMember(Value = "TypeA")]
        TYPE_A,
        [EnumMember(Value = "TypeB")]
        TYPE_B,
        [EnumMember(Value = "TypeC")]
        TYPE_C,
    }

    public enum TagOrSpeciesOrStringDouble
    {
        _1337 = 1337d,
    }

    [JsonConverter(typeof(StringEnumConverter))]
    public enum Tag
    {
        [EnumMember(Value = "TagA")]
        TAG_A,
        [EnumMember(Value = "TagB")]
        TAG_B,
        [EnumMember(Value = "TagC")]
        TAG_C,
    }

    public class Thing
    {
        [JsonProperty("id", Required = Required.Always)]
        [Required]
        public string Id { get; }
        [JsonProperty("tag")]
        public Tag? Tag { get; }
        [JsonProperty("type")]
        public ThingType? Type { get; }

        public Thing(string id, ThingType? type, Tag? tag)
        {
            this.Id = id;
            this.Type = type;
            this.Tag = tag;
        }
    }

    [JsonConverter(typeof(StringEnumConverter))]
    public enum Species
    {
        [EnumMember(Value = "SpeciesA")]
        SPECIES_A,
        [EnumMember(Value = "SpeciesB")]
        SPECIES_B,
    }

    public class TagOrSpeciesOrString
    {
        private const IDictionary<Object, TagOrSpeciesOrString> _values = new Dictionary<Object, TagOrSpeciesOrString>();
        public const TagOrSpeciesOrString _1337 = TagOrSpeciesOrString.get(1337d);
        public const TagOrSpeciesOrString FOO = TagOrSpeciesOrString.get("foo");
        public const TagOrSpeciesOrString SPECIES_A = TagOrSpeciesOrString.get("SpeciesA");
        public const TagOrSpeciesOrString SPECIES_B = TagOrSpeciesOrString.get("SpeciesB");
        public const TagOrSpeciesOrString TAG_A = TagOrSpeciesOrString.get("TagA");
        public const TagOrSpeciesOrString TAG_B = TagOrSpeciesOrString.get("TagB");
        public const TagOrSpeciesOrString TAG_C = TagOrSpeciesOrString.get("TagC");

        private TagOrSpeciesOrString(Object value)
        {
            this.Value = value;
        }

        public Species? getAsSpecies()
        {
            return Species?.valueOf(((string) this.Value));
        }

        public Tag? getAsTag()
        {
            return Tag?.valueOf(((string) this.Value));
        }

        public TagOrSpeciesOrStringDouble? getAsTagOrSpeciesOrStringDouble()
        {
            return TagOrSpeciesOrStringDouble?.valueOf(((double) this.Value));
        }

        public bool isKnown()
        {
            return this == TagOrSpeciesOrString.TAG_A || this == TagOrSpeciesOrString.TAG_B || this == TagOrSpeciesOrString.TAG_C || this == TagOrSpeciesOrString.SPECIES_A || this == TagOrSpeciesOrString.SPECIES_B || this == TagOrSpeciesOrString._1337 || this == TagOrSpeciesOrString.FOO;
        }

        public bool isSpecies()
        {
            return this == TagOrSpeciesOrString.SPECIES_A || this == TagOrSpeciesOrString.SPECIES_B;
        }

        public bool isTag()
        {
            return this == TagOrSpeciesOrString.TAG_A || this == TagOrSpeciesOrString.TAG_B || this == TagOrSpeciesOrString.TAG_C;
        }

        public bool isTagOrSpeciesOrStringDouble()
        {
            return this == TagOrSpeciesOrString._1337;
        }

        [JsonConstructor]
        public static TagOrSpeciesOrString get(Object value)
        {
            if (TagOrSpeciesOrString._values.containsKey(value))
            {
                return TagOrSpeciesOrString._values.get(value);
            }
            else
            {
                final var created = new TagOrSpeciesOrString(value);
                TagOrSpeciesOrString._values[value] = created;
                return created;
            }
        }

        public Object Value { get; }
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
        public dynamic Data { get; }
        [JsonProperty("message")]
        public string Message { get; }

        public JsonRpcError(dynamic data, string message, int code)
        {
            this.Data = data;
            this.Message = message;
            this.Code = code;
        }
    }

    public class ListThingsError100Error : JsonRpcError
    {
        public ListThingsError100Error(dynamic data, string message) : base(data, message ?? "Server is busy", 100) { }
    }

    /// <summary>
    /// Generic class to describe the JsonRpc error response package
    /// </summary>
    public class JsonRpcErrorResponse<T>
      where T : JsonRpcError
    {
        [JsonProperty("error", Required = Required.Always)]
        [Required]
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

    public class ListThingsError100 : JsonRpcErrorResponse<ListThingsError100Error>
    {
        public ListThingsError100(string id, ListThingsError100Error error) : base(id, error) { }
    }

    public class ErrorUnknownError : JsonRpcError
    {
        public ErrorUnknownError(dynamic data, string message, int? code) : base(data, message ?? "Unknown Error", code ?? -1) { }
    }

    public class ErrorUnknown : JsonRpcErrorResponse<ErrorUnknownError>
    {
        public ErrorUnknown(string id, ErrorUnknownError error) : base(id, error) { }
    }
}
