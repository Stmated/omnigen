using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Runtime.Serialization;

namespace generated.omnigen
{
    /// <summary>
    /// A comment
    /// </summary>
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    [JsonConverter(typeof(StringEnumConverter))]
    public enum Kind1
    {
        [EnumMember(Value = "1A")]
        _1_A,
        [EnumMember(Value = "1B")]
        _1_B,
    }
}
