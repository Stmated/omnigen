using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Runtime.Serialization;

namespace generated.omnigen
{
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    [JsonConverter(typeof(StringEnumConverter))]
    public enum StringBoolean
    {
        [EnumMember(Value = "0")]
        Fail,
        [EnumMember(Value = "1")]
        OK,
    }
}
