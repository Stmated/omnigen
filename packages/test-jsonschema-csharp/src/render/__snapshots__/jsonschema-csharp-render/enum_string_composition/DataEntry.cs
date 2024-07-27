using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace generated.omnigen
{
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    public class DataEntry
    {
        /// <summary>
        /// The current state of the withdrawal.
        /// </summary>
        /// <remarks>Enum Description</remarks>
        /// <example>EXECUTING</example>
        /// <example>EXECUTED</example>
        /// <example>PENDING</example>
        [JsonProperty("transferstate", Required = Required.Always)]
        [Required]
        public string Transferstate { get; }

        public DataEntry(string transferstate)
        {
            this.Transferstate = transferstate;
        }
    }
}
