namespace generated.omnigen
{
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    public class CancelChargeRequestDataBase : ICancelChargeRequestDataBase
    {
        public double OrderID { get; }

        public CancelChargeRequestDataBase(double orderId)
        {
            this.OrderID = orderId;
        }
    }
}
