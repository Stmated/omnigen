using Newtonsoft.Json.JsonPropertyAttribute;

namespace generated.omnigen
{
  /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
  public class Order
  {
    /// <summary>
    /// If true, then the order is still active, otherwise it is cancelled
    /// </summary>
    [JsonProperty("active")]
    public boolean Active { get; }
    /// <summary>
    /// Unique Order Id
    /// </summary>
    [JsonProperty("id")]
    public int Id { get; }
    /// <summary>
    /// The percentage of completion for the order
    /// </summary>
    [JsonProperty("percentage")]
    public int Percentage { get; }

    public Order(int id, boolean active, int percentage)
    {
      this.Id = id;
      this.Active = active;
      this.Percentage = percentage;
    }
  }
}
