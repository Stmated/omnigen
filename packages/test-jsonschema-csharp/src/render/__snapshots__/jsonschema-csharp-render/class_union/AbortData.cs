using Newtonsoft.Json.JsonPropertyAttribute;
using Newtonsoft.Json.Required;

namespace generated.omnigen
{
  /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
  public class AbortData
  {
    [JsonProperty("orderid", Required = Required.Always)]
    public string Orderid { get; }
    /// <summary>
    /// Some descriptive description.
    /// </summary>
    /// <see cref="StringBoolean" />
    [JsonProperty("system_initiated")]
    public string SystemInitiated { get; }
    /// <see cref="StringBoolean" />
    [JsonProperty("user_initiated")]
    public string UserInitiated { get; }

    public AbortData(string orderid, string userInitiated, string systemInitiated)
    {
      this.Orderid = orderid;
      this.UserInitiated = userInitiated;
      this.SystemInitiated = systemInitiated;
    }
  }
}
