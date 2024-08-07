using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace generated.omnigen
{
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    public class AbortData
    {
        [JsonProperty("orderid", Required = Required.Always)]
        [Required]
        public string Orderid { get; }
        /// <summary>
        /// Some descriptive description.
        /// </summary>
        [JsonProperty("system_initiated")]
        public StringBoolean? SystemInitiated { get; }
        [JsonProperty("user_initiated")]
        public StringBoolean? UserInitiated { get; }

        public AbortData(string orderid, StringBoolean? userInitiated, StringBoolean? systemInitiated)
        {
            this.Orderid = orderid;
            this.UserInitiated = userInitiated;
            this.SystemInitiated = systemInitiated;
        }
    }
}
