using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.ComponentModel.DataAnnotations;

namespace generated.omnigen
{
    /// <remarks>Generated by Omnigen @ 2000-01-02T03:04:05.000Z</remarks>
    [JsonConverter(typeof(WrapperConverter<ResponseData>), "Raw")]
    public class ResponseData
    {
        private ResponseDataWithReject _responseDataWithReject;
        private ResponseDataWithResult _responseDataWithResult;

        public ResponseData(JToken raw)
        {
            this.Raw = raw;
        }

        public ResponseDataWithReject GetResponseDataWithReject(JsonSerializer transformer)
        {
            if (this._responseDataWithReject != null)
            {
                return this._responseDataWithReject;
            }
            return this._responseDataWithReject = this.Raw.ToObject<ResponseDataWithReject>(transformer);
        }

        public ResponseDataWithResult GetResponseDataWithResult(JsonSerializer transformer)
        {
            if (this._responseDataWithResult != null)
            {
                return this._responseDataWithResult;
            }
            return this._responseDataWithResult = this.Raw.ToObject<ResponseDataWithResult>(transformer);
        }

        public JToken Raw { get; }
    }

    public class ResponseDataWithReject
    {
        [JsonProperty("rejected", Required = Required.Always)]
        [Required]
        public string Rejected { get; }
        [JsonProperty("result")]
        [Required]
        public string Result { get; } = "0";

        public ResponseDataWithReject(string rejected)
        {
            this.Rejected = rejected;
        }
    }

    public class ResponseDataWithResult
    {
        [JsonProperty("result")]
        [Required]
        public string Result { get; } = "1";
    }
}
