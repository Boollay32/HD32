namespace HelpDeskNet8.Requests
{
    public class GetChangeRequestsRequest : AuthenticatedRequest
    {
        public Dictionary<string, string> Filters { get; set; }
    }

    public class GetChangeRequestDetailRequest : AuthenticatedRequest
    {
        public int RFCId { get; set; }
    }

    public class SaveChangeRequestRequest : AuthenticatedRequest
    {
        public int RFCId { get; set; }
        public string ObjectInfo { get; set; }
        public string Attachment { get; set; }
        public int UTC { get; set; }
    }
}
