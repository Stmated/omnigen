using Newtonsoft.Json.JsonPropertyAttribute;
using Newtonsoft.Json.Required;

namespace generated.omnigen
{
  /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
  public class DefaultData
  {
    /// <summary>
    /// Some inline description
    /// </summary>
    /// <see cref="StringBoolean" />
    [JsonProperty("inlineResult")]
    public string InlineResult { get; }
    [JsonProperty("orderid", Required = Required.Always)]
    public string Orderid { get; }

    public DefaultData(string orderid, string inlineResult)
    {
      this.Orderid = orderid;
      this.InlineResult = inlineResult;
    }
  }
}
