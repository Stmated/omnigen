namespace generated.omnigen
{
  /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
  public class DefaultData
  {
    /// <summary>
    /// Some inline description
    /// </summary>
    /// <see cref="StringBoolean" />
    public string InlineResult { get; }
    /// <example>9594811343</example>
    public string Orderid { get; }

    public DefaultData(string orderid, string inlineResult)
    {
      this.Orderid = orderid;
      this.InlineResult = inlineResult;
    }
  }
}