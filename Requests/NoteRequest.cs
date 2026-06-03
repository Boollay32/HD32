using HelpDeskNet8.Interfaces.Attachments;

namespace HelpDeskNet8.Requests
{
    public class GetNotesRequest : AuthenticatedRequest
    {
        public int TicketId { get; set; }
    }

    public class SaveNoteRequest : AuthenticatedRequest
    {
        public string ObjectInfo { get; set; }
        public IEnumerable<IAttachment> Attachments { get; set; } = Enumerable.Empty<IAttachment>();
        public bool RFC { get; set; }
    }

    public class GetRFCNotesRequest : AuthenticatedRequest
    {
        public int RFCId { get; set; }
    }
}
