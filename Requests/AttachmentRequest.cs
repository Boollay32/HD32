namespace HelpDeskNet8.Requests
{
    public class GetAttachmentsNotesRequest : AuthenticatedRequest
    {
        public int TicketId { get; set; }
        public int RFC { get; set; }
    }

    public class GetAttachmentsTasksRequest : AuthenticatedRequest
    {
        public int TicketId { get; set; }
    }
}
